package com.adaptlearngraph.config;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.repository.PlatformAdministratorSeeds;
import com.adaptlearngraph.utility.RegistrationCryptography;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Component
@Profile("platform-bootstrap")
public final class PlatformAdministratorBootstrap implements ApplicationRunner {
    private final PlatformAdministratorSeeds seeds;
    private final TransactionTemplate transactions;
    private final String email;
    private final String password;
    public PlatformAdministratorBootstrap(PlatformAdministratorSeeds seeds,
            @Qualifier(TransactionManagers.JPA) PlatformTransactionManager manager,
            @Value("${PLATFORM_ADMIN_SEED_EMAIL:}") String email,
            @Value("${PLATFORM_ADMIN_SEED_PASSWORD:}") String password) {
        this.seeds=seeds;this.transactions=new TransactionTemplate(manager);this.email=email;this.password=password;
    }
    @Override
    public void run(ApplicationArguments arguments) {
        if(email==null || email.isBlank() || password==null || password.isBlank()) {
            throw new IllegalStateException("Configure PLATFORM_ADMIN_SEED_EMAIL and PLATFORM_ADMIN_SEED_PASSWORD outside source control.");
        }
        String normalized=com.adaptlearngraph.entities.RegistrationFields.normalizeEmail(email);
        if(normalized.length()>254 || !normalized.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")) {
            throw new IllegalArgumentException("Platform seed email is invalid.");
        }
        com.adaptlearngraph.entities.RegistrationFields.validatePassword(password);
        var passwords=new RegistrationCryptography("", "");
        transactions.executeWithoutResult(tx->{
            seeds.lock(normalized);
            var existing=seeds.lockExisting(normalized);
            if(existing.isPresent()) {
                var account=existing.get();
                if(!Boolean.TRUE.equals(account.active()) || account.organizationId()!=null
                        || !Boolean.TRUE.equals(account.platformAdministrator()) || Boolean.TRUE.equals(account.registered())
                        || !passwords.passwordMatches(password,account.passwordHash())) {
                    throw new IllegalStateException("Seed identity conflicts with an existing account or credentials. No account was changed.");
                }
                return;
            }
            seeds.create(normalized,passwords.hashPassword(password));
        });
    }
}
