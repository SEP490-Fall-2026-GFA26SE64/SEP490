package com.adaptlearngraph.apis;

import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.adaptlearngraph.entities.domain.QuestionBank;
import com.adaptlearngraph.entities.domain.QuestionBank.Content;
import com.adaptlearngraph.entities.domain.QuestionBank.ImportBatch;
import com.adaptlearngraph.entities.domain.QuestionBank.Question;
import com.adaptlearngraph.entities.domain.QuestionBank.Row;
import com.adaptlearngraph.entities.domain.QuestionBank.Version;
import com.adaptlearngraph.helper.ModelMapperFactory;
import com.adaptlearngraph.helper.QuestionBankMappings;
import com.adaptlearngraph.services.QuestionBankApplicationService;
import com.adaptlearngraph.services.QuestionBankUseCase;
import com.adaptlearngraph.services.QuestionBankUseCase.View;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/** Staff Question Bank JSON keeps its authoring contract; use-case rejections keep status, message and no-store. */
class QuestionBankControllerTest {
    private static final UUID BANK = new UUID(0L, 1);
    private static final String PATH = "/api/v1/question-bank";

    private final QuestionBankUseCase bank = mock(QuestionBankUseCase.class);
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new QuestionBankController(new QuestionBankApplicationService(
            bank, ModelMapperFactory.create(List.of(new QuestionBankMappings()))))).build();

    @Test
    void readKeepsTheStaffAuthoringShape() throws Exception {
        var version = new Version();
        version.id = new UUID(0L, 3);
        version.number = 1;
        version.state = "DRAFT";
        version.content = new Content("Which keyword?", List.of("A", "B"), 1, "skill-java", "Java", "EASY", "Because B");
        var question = new Question();
        question.id = new UUID(0L, 2);
        question.code = "Q-001";
        question.versions = List.of(version);
        when(bank.read()).thenReturn(new View(BANK, "Java bank", List.of(question), List.of()));

        mvc.perform(get(PATH))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.id").value(BANK.toString()))
                .andExpect(jsonPath("$.questions[0].code").value("Q-001"))
                .andExpect(jsonPath("$.questions[0].versions[0].content.correctAnswer").value(1))
                .andExpect(jsonPath("$.questions[0].versions[0].content.explanation").value("Because B"))
                .andExpect(jsonPath("$.organization").doesNotExist());
    }

    @Test
    void saveAndPreviewTranslateContentExplicitly() throws Exception {
        when(bank.save(argThat(save -> save.code().equals("Q-9") && save.expectedRevision() == null
                && save.content().prompt().equals("p") && save.content().options().isEmpty() && save.acknowledgeDuplicates())))
                .thenReturn(new View(BANK, "Java bank", List.of(), List.of()));
        mvc.perform(post(PATH + "/questions").contentType("application/json")
                        .content("{\"code\":\"Q-9\",\"content\":{\"prompt\":\"p\",\"options\":null},\"acknowledgeDuplicates\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Java bank"));

        var batch = new ImportBatch();
        batch.id = new UUID(0L, 7);
        batch.rows = List.of(new Row("Q-1", new Content("p", List.of("a", "b"), 0, null, null, null, null)));
        when(bank.preview(argThat(preview -> preview.rows().equals(List.of(
                new Row("Q-1", new Content("p", List.of("a", "b"), 0, null, null, null, null)))))))
                .thenReturn(batch);
        mvc.perform(post(PATH + "/imports/preview").contentType("application/json")
                        .content("{\"rows\":[{\"code\":\"Q-1\",\"content\":{\"prompt\":\"p\",\"options\":[\"a\",\"b\"],\"correctAnswer\":0}}]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(batch.id.toString()))
                .andExpect(jsonPath("$.rows[0].content.correctAnswer").value(0));
    }

    @Test
    void useCaseRejectionKeepsStatusAndMessage() throws Exception {
        when(bank.read()).thenThrow(new QuestionBank.Failure(409, "Question changed. Reload."));

        mvc.perform(get(PATH))
                .andExpect(status().isConflict())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(content().json("{\"message\":\"Question changed. Reload.\"}", true));
    }
}