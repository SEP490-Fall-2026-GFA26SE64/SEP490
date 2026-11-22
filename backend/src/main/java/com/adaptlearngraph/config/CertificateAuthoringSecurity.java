package com.adaptlearngraph.config;
import com.adaptlearngraph.repository.QuestionBankPorts.Actors;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.*;
import java.util.Map;
import org.springframework.context.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.web.filter.OncePerRequestFilter;

/** Trusted staff identity and the existing Spring session CSRF protection cover JSON and multipart commands. */
@Configuration(proxyBeanMethods=false)
@Profile("local & workspace-baseline & !prod & !local-baseline-demo")
public class CertificateAuthoringSecurity {
 @Bean @Order(-10) SecurityFilterChain certificateAuthoringFilterChain(HttpSecurity http,Actors actors,ObjectMapper json)throws Exception {
  return http.securityMatcher("/api/v1/expert/certificate-definitions","/api/v1/expert/certificate-definitions/**","/api/v1/ld-manager/certificate-definitions","/api/v1/ld-manager/certificate-definitions/**")
   .addFilterBefore(new OncePerRequestFilter(){
    @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain)throws ServletException,IOException {
     try{var a=actors.require();if(req.getRequestURI().startsWith("/api/v1/ld-manager/")?!a.manager():!a.expert())throw new com.adaptlearngraph.entities.domain.QuestionBank.Failure(403,"FORBIDDEN");
      if(req.getContentLengthLong()>6*1024*1024)throw new com.adaptlearngraph.entities.domain.QuestionBank.Failure(413,"REQUEST_TOO_LARGE");chain.doFilter(req,res);
     }catch(com.adaptlearngraph.entities.domain.QuestionBank.Failure e){res.setStatus(e.status());res.setContentType("application/json");res.setHeader("Cache-Control","no-store");json.writeValue(res.getWriter(),Map.of("code",e.getMessage()));}
     catch(com.adaptlearngraph.exception.SubscriptionFailure|com.adaptlearngraph.exception.RegistrationFailure e){res.setStatus(403);res.setContentType("application/json");json.writeValue(res.getWriter(),Map.of("code","FORBIDDEN"));}
    }
   },AuthorizationFilter.class).authorizeHttpRequests(a->a.anyRequest().permitAll())
   .exceptionHandling(e->e.accessDeniedHandler((req,res,f)->{res.setStatus(403);res.setContentType("application/json");json.writeValue(res.getWriter(),Map.of("code","FORBIDDEN"));})).build();
 }
}
