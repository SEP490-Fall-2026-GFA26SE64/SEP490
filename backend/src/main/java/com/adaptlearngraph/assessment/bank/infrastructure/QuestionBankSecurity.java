package com.adaptlearngraph.assessment.bank.infrastructure;

import com.adaptlearngraph.assessment.bank.application.port.out.QuestionBankPorts.Actors;
import com.adaptlearngraph.assessment.bank.domain.QuestionBank.Failure;
import com.adaptlearngraph.subscription.domain.SubscriptionFailure;
import com.adaptlearngraph.identity.domain.RegistrationFailure;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.annotation.Value;
import java.util.Map;
import org.springframework.context.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.web.filter.OncePerRequestFilter;

@Configuration(proxyBeanMethods=false)
@Profile("local & workspace-baseline & !prod & !local-baseline-demo")
public class QuestionBankSecurity {
    @Bean @Order(-11) SecurityFilterChain questionBankFilterChain(HttpSecurity http,Actors actors,ObjectMapper json,@Value("${question-bank.import.max-bytes:10485760}") int maxBytes)throws Exception {
        return http.securityMatcher("/api/v1/question-bank","/api/v1/question-bank/**")
            .addFilterBefore(new OncePerRequestFilter(){
                @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain)throws ServletException,IOException {
                    try{actors.require();if(req.getContentLengthLong()>maxBytes)throw new Failure(413,"Request exceeds the configured size limit");
                        if("POST".equals(req.getMethod())){byte[] bytes=req.getInputStream().readNBytes(maxBytes+1);if(bytes.length>maxBytes)throw new Failure(413,"Request exceeds the configured size limit");chain.doFilter(new HttpServletRequestWrapper(req){
                            @Override public ServletInputStream getInputStream(){var input=new ByteArrayInputStream(bytes);return new ServletInputStream(){public int read(){return input.read();}public boolean isFinished(){return input.available()==0;}public boolean isReady(){return true;}public void setReadListener(ReadListener listener){throw new UnsupportedOperationException("Synchronous JSON request");}};}
                            @Override public BufferedReader getReader(){return new BufferedReader(new InputStreamReader(getInputStream(),StandardCharsets.UTF_8));}
                        },res);}else chain.doFilter(req,res);
                    }
                    catch(Failure e){error(res,e.status(),e.getMessage());}
                    catch(SubscriptionFailure|RegistrationFailure e){error(res,403,"Sign in with an authorized organization staff account");}
                }
                private void error(HttpServletResponse res,int code,String message)throws IOException{res.setStatus(code);res.setContentType("application/json");res.setHeader("Cache-Control","no-store");json.writeValue(res.getWriter(),Map.of("message",message));}
            },AuthorizationFilter.class)
            .authorizeHttpRequests(a->a.anyRequest().permitAll())
            .exceptionHandling(e->e.accessDeniedHandler((req,res,error)->{res.setStatus(403);res.setContentType("application/json");json.writeValue(res.getWriter(),Map.of("message","Request protection failed. Reload and retry."));})).build();
    }
}
