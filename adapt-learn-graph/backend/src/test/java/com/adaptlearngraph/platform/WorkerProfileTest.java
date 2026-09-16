package com.adaptlearngraph.platform;

import static org.assertj.core.api.Assertions.assertThat;

import com.adaptlearngraph.platform.application.SystemStatusService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.context.WebApplicationContext;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles({ "starter", "worker" })
class WorkerProfileTest {
    @Autowired
    private ApplicationContext context;

    @Test
    void startsWithoutAnHttpServer() {
        assertThat(context).isNotInstanceOf(WebApplicationContext.class);
        assertThat(context.getBean(SystemStatusService.class).getStatus().stage()).isEqualTo("SCAFFOLD");
    }
}