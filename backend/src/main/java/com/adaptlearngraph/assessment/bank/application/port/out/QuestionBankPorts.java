package com.adaptlearngraph.assessment.bank.application.port.out;

import com.adaptlearngraph.assessment.bank.domain.QuestionBank;
import com.adaptlearngraph.assessment.bank.domain.QuestionBank.*;
import java.util.*;
import java.util.function.Function;

public final class QuestionBankPorts {
    private QuestionBankPorts() {}
    public interface Actors { Actor require(); }
    public interface Catalog {
        List<Choice> skills(Actor actor);
        String requireSkill(Actor actor, String id);
        List<Choice> experts(Actor actor);
        List<Choice> managers(Actor actor);
        void requireExpert(Actor actor, UUID id);
    }
    public interface Store {
        <T> T atomic(Actor actor, Function<QuestionBank,T> command);
    }
}
