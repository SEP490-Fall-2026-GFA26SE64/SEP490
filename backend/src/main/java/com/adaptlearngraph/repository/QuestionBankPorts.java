package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.QuestionBank;
import com.adaptlearngraph.entities.domain.QuestionBank.*;
import java.util.*;
import java.util.function.Function;

public final class QuestionBankPorts {
    private QuestionBankPorts() {}
    public interface Actors { Actor require(); }
    public interface Catalog {
        List<Choice> skills(Actor actor);
        default List<KnowledgeChoice> knowledge(Actor actor){return List.of();}
        String requireSkill(Actor actor, String id);
        String requireKnowledge(Actor actor,String skill,String knowledgeLevel);
        List<Choice> experts(Actor actor);
        List<Choice> managers(Actor actor);
        void requireExpert(Actor actor, UUID id);
    }
    public interface Store {
        <T> T atomic(Actor actor, Function<QuestionBank,T> command);
    }
}
