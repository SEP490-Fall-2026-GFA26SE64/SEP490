package com.adaptlearngraph.config;

import com.adaptlearngraph.repository.RegistrationSecrets;
import com.adaptlearngraph.repository.WorkspaceBaselineTestFixtures;

import com.adaptlearngraph.helper.PayOsPaymentGateway;
import com.adaptlearngraph.AdaptLearnGraphApplication;
import com.adaptlearngraph.helper.PaymentGateway;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import vn.payos.PayOS;
import vn.payos.core.ClientOptions;

/** Only packaged in the isolated test image, never in the production application. */
public final class SubscriptionTestRuntime {
    public static void main(String[] args) {
        if(!"true".equals(System.getenv("ISOLATED_SUBSCRIPTION_TEST"))) throw new IllegalStateException("Isolated test runtime requires explicit opt-in.");
        SpringApplication.run(new Class<?>[]{RuntimeConfiguration.class,Fixtures.class,FixtureSecurity.class},args);
    }
    @TestConfiguration(proxyBeanMethods=false)
    @org.springframework.boot.autoconfigure.EnableAutoConfiguration
    @org.springframework.context.annotation.ComponentScan(basePackages="com.adaptlearngraph",excludeFilters={
        @org.springframework.context.annotation.ComponentScan.Filter(type=org.springframework.context.annotation.FilterType.REGEX,pattern=".*Test.*"),
        @org.springframework.context.annotation.ComponentScan.Filter(type=org.springframework.context.annotation.FilterType.ASSIGNABLE_TYPE,classes=AdaptLearnGraphApplication.class)
    })
    public static class RuntimeConfiguration {}
    @TestConfiguration(proxyBeanMethods=false)
    public static class Fixtures {
        @Bean WorkspaceBaselineTestFixtures baselineFixtures(JdbcTemplate jdbc, RegistrationSecrets secrets,
                org.springframework.transaction.PlatformTransactionManager manager, org.neo4j.driver.Driver graph, ObjectMapper json) {
            return new WorkspaceBaselineTestFixtures(jdbc,secrets,manager,graph,json);
        }
        @Bean(destroyMethod="close") Provider provider(ObjectMapper mapper) throws Exception { return new Provider(mapper); }
        @Bean @Primary PaymentGateway isolatedPaymentGateway(Provider provider,ObjectMapper mapper) {
            return new PayOsPaymentGateway(provider.client,mapper);
        }
        @Bean FixtureController fixtures(JdbcTemplate jdbc,RegistrationSecrets secrets,Provider provider,
                org.springframework.transaction.PlatformTransactionManager manager) { return new FixtureController(jdbc,secrets,provider,manager); }
    }
    static final class Provider implements AutoCloseable {
        final ObjectMapper json;
        final HttpServer server;
        final PayOS client;
        final Map<Long,Map<String,Object>> links=new ConcurrentHashMap<>();
        Provider(ObjectMapper json) throws Exception {
            this.json=json;
            server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
            client=new PayOS(ClientOptions.builder().clientId("isolated").apiKey("isolated").checksumKey("isolated-checksum")
                    .baseURL("http://127.0.0.1:"+server.getAddress().getPort()).maxRetries(0).timeoutMs(2000).logLevel(ClientOptions.LogLevel.NONE).build());
            server.createContext("/v2/payment-requests",exchange->{
                int status=200;
                Map<String,Object> response;
                if(exchange.getRequestMethod().equals("POST")) {
                    var input=json.readTree(exchange.getRequestBody());
                    long code=input.path("orderCode").asLong();
                    Map<String,Object> data=new LinkedHashMap<>();
                    data.put("orderCode",code);data.put("amount",input.path("amount").asLong());data.put("currency","VND");
                    data.put("paymentLinkId","link-"+code);data.put("status","PENDING");data.put("checkoutUrl","https://pay.payos.vn/web/link-"+code);
                    data.put("bin","970000");data.put("accountNumber","test-only");data.put("accountName","Isolated");
                    data.put("qrCode","test-only");data.put("description",input.path("description").asText());
                    links.putIfAbsent(code,data);
                    response=envelope(links.get(code));
                } else {
                    String id=exchange.getRequestURI().getPath().substring("/v2/payment-requests/".length());
                    Map<String,Object> original=links.get(Long.parseLong(id));
                    if(original==null) { status=404;response=Map.of("code","404","desc","not found"); }
                    else {
                        boolean paid="PAID".equals(original.get("status"));
                        response=envelope(Map.of("id",original.get("paymentLinkId"),"orderCode",original.get("orderCode"),
                                "amount",original.get("amount"),"amountPaid",paid?original.get("amount"):0,
                                "amountRemaining",paid?0:original.get("amount"),"status",original.get("status"),
                                "createdAt",Instant.now().toString(),"transactions",java.util.List.of()));
                    }
                }
                byte[] bytes=json.writeValueAsBytes(response);
                exchange.getResponseHeaders().set("Content-Type","application/json");
                exchange.sendResponseHeaders(status,bytes.length);
                try(var out=exchange.getResponseBody()) { out.write(bytes); }
            });
            server.start();
        }
        Map<String,Object> envelope(Map<String,Object> data) {
            return Map.of("code","00","desc","success","data",data,"signature",client.getCrypto().createSignatureFromObj(data,"isolated-checksum"));
        }
        Map<String,Object> paid(long code,long amount) {
            var link=links.get(code);
            if(link!=null) link.put("status","PAID");
            var data=new LinkedHashMap<String,Object>();
            data.put("orderCode",code);data.put("amount",amount);data.put("currency","VND");data.put("paymentLinkId","link-"+code);
            data.put("description","test-only");data.put("accountNumber","test-only");data.put("reference","reference-"+code);
            data.put("transactionDateTime","2026-10-23 12:00:00");data.put("code","00");data.put("desc","success");
            return envelope(data);
        }
        @Override public void close() { client.close();server.stop(0); }
    }
    @RestController
    @org.springframework.boot.test.context.TestComponent
    static final class FixtureController {
        private final JdbcTemplate jdbc; private final RegistrationSecrets secrets; private final Provider provider;
        private final org.springframework.transaction.PlatformTransactionManager manager;
        @org.springframework.beans.factory.annotation.Autowired private com.adaptlearngraph.repository.PlatformAdministratorSeeds platformSeeds;
        @org.springframework.beans.factory.annotation.Autowired private com.adaptlearngraph.repository.PaymentOrderStore orders;
        @org.springframework.beans.factory.annotation.Autowired private com.adaptlearngraph.repository.PaymentProcessingStore payments;
        FixtureController(JdbcTemplate jdbc,RegistrationSecrets secrets,Provider provider,
                org.springframework.transaction.PlatformTransactionManager manager) { this.jdbc=jdbc;this.secrets=secrets;this.provider=provider;this.manager=manager; }
        @PostMapping("/api/v1/__subscription-test/platform-seed")
        Map<String,Object> seededPlatform() {
            String email="seed-"+UUID.randomUUID()+"@example.test";
            String password=UUID.randomUUID().toString();
            var seed=new com.adaptlearngraph.config.PlatformAdministratorBootstrap(platformSeeds,manager,email,password);
            seed.run(null);
            seed.run(null);
            return Map.of("email",email,"password",password);
        }
        @PostMapping("/api/v1/__subscription-test/registrant")
        Map<String,Object> registrant(@RequestParam(defaultValue="false") boolean platform) {
            UUID account=UUID.randomUUID(),registration=UUID.randomUUID();
            String email=account+"@example.test",password="isolated-subscription-password",secret=secrets.newTotpSecret();
            jdbc.update("INSERT INTO platform.account(account_id,identifier,normalized_identifier,password_hash) VALUES (?,?,?,?)",account,email,email,secrets.hashPassword(password));
            jdbc.update("""
                    INSERT INTO platform.organization_registration(registration_id,account_id,organization_name,workspace_slug,admin_name,state,
                      email_verified_at,completed_at,created_at,updated_at) VALUES (?,?,?,?,'Test Administrator','REGISTERED',now(),now(),now(),now())
                    """,registration,account,"Test Organization "+registration,"test-"+registration);
            jdbc.update("INSERT INTO platform.account_totp(account_id,encrypted_secret,enabled_at,last_used_step) VALUES (?,?,now(),0)",account,secrets.encrypt(secret,"totp:"+account));
            if(platform) jdbc.update("INSERT INTO platform.platform_administrator(account_id,granted_at,grant_source) VALUES (?,now(),'OPERATOR')",account);
            return Map.of("accountId",account,"registrationId",registration,"email",email,"password",password,"totpSecret",secret);
        }
        @PostMapping("/api/v1/__subscription-test/pay/{orderId}")
        Map<String,Object> payment(@PathVariable UUID orderId) {
            return jdbc.queryForObject("SELECT provider_order_code,price_vnd FROM platform.payment_order WHERE order_id=?",
                    (rs,i)->provider.paid(rs.getLong(1),rs.getLong(2)),orderId);
        }
        @PostMapping("/api/v1/__subscription-test/organization-directory")
        Map<String,Object> directory(@RequestParam(defaultValue="ACTIVE") String coverage) {
            if (!java.util.Set.of("ACTIVE", "EXPIRED", "NONE").contains(coverage))
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST);
            var account = new LinkedHashMap<>(registrant(false));
            UUID accountId = (UUID) account.get("accountId"), registrationId = (UUID) account.get("registrationId");
            UUID organization;
            if ("NONE".equals(coverage)) {
                organization = UUID.randomUUID();
                jdbc.update("INSERT INTO platform.organization(organization_id,code,name) VALUES (?,?,?)",
                        organization, "DIR_" + organization.toString().toUpperCase(java.util.Locale.ROOT), "Directory no subscription " + organization);
                jdbc.update("UPDATE platform.account SET organization_id=? WHERE account_id=?", organization, accountId);
                jdbc.update("""
                        INSERT INTO platform.organization_workspace(workspace_id,organization_id,registration_id,slug,setup_state,created_at,failure_code)
                        VALUES (?,?,?,?,'FAILED',now(),'TEST_FIXTURE')
                        """, UUID.randomUUID(), organization, registrationId, "directory-" + organization);
            } else {
                Instant at = "EXPIRED".equals(coverage) ? Instant.now().minus(java.time.Duration.ofDays(120)) : Instant.now();
                var plan = jdbc.queryForMap("SELECT plan_id,current_version_id FROM platform.subscription_plan WHERE code='starter'");
                var actor = new com.adaptlearngraph.entities.domain.SubscriptionAccessPolicy.Actor(
                        accountId, null, true, false, java.util.Set.of(), true);
                var order = orders.create(new com.adaptlearngraph.repository.SubscriptionIdentity.Context(actor, registrationId),
                        new com.adaptlearngraph.repository.PaymentOrderStore.Command(null, (UUID) plan.get("plan_id"),
                                (UUID) plan.get("current_version_id"), UUID.randomUUID(), null), at);
                payments.record(new PaymentGateway.Observation(order.providerOrderCode(), "directory-" + order.orderId(),
                        order.terms().priceVnd(), null, "VND", "PAID", "directory-" + order.orderId(), null, at,
                        "WEBHOOK", java.util.HexFormat.of().formatHex(
                                java.nio.ByteBuffer.allocate(32).putLong(order.providerOrderCode()).array())), at);
                payments.apply(order.orderId(), at);
                organization = jdbc.queryForObject("SELECT organization_id FROM platform.organization_workspace WHERE registration_id=?",
                        UUID.class, registrationId);
                jdbc.update("""
                        INSERT INTO platform.workspace_account_profile(account_id,full_name,email_verified_at)
                        VALUES (?,'Current Directory Administrator',now())
                        ON CONFLICT (account_id) DO UPDATE SET full_name=EXCLUDED.full_name
                        """, accountId);
                if ("EXPIRED".equals(coverage))
                    jdbc.update("UPDATE platform.organization_membership SET active=false WHERE account_id=?", accountId);
            }
            account.put("organizationId", organization);
            account.put("organizationName", jdbc.queryForObject("SELECT name FROM platform.organization WHERE organization_id=?", String.class, organization));
            return account;
        }
        @PostMapping("/api/v1/__subscription-test/references/{organization}")
        void references(@PathVariable UUID organization) {
            UUID department=UUID.randomUUID(),jobPosition=UUID.randomUUID();
            jdbc.update("INSERT INTO platform.department_reference VALUES (?,?,'Test Department',true)",department,organization);
            jdbc.update("INSERT INTO platform.job_position_department_reference VALUES (?,?,?,?,'Test JobPosition',true)",jobPosition,UUID.randomUUID(),organization,department);
        }
        @PostMapping("/api/v1/__subscription-test/expire/{orderId}")
        void expire(@PathVariable UUID orderId) {
            long code=jdbc.queryForObject("SELECT provider_order_code FROM platform.payment_order WHERE order_id=?",Long.class,orderId);
            var link=provider.links.get(code);
            if(link==null) throw new IllegalStateException("Create checkout before expiring the test provider link.");
            link.put("status","EXPIRED");
        }
    }
    @TestConfiguration(proxyBeanMethods=false)
    public static class FixtureSecurity {
        @Bean @org.springframework.core.annotation.Order(-100)
        org.springframework.security.web.SecurityFilterChain fixtureSecurity(org.springframework.security.config.annotation.web.builders.HttpSecurity http) throws Exception {
            return http.securityMatcher("/api/v1/__subscription-test/**").csrf(csrf->csrf.disable())
                    .authorizeHttpRequests(auth->auth.anyRequest().permitAll()).build();
        }
    }
}
