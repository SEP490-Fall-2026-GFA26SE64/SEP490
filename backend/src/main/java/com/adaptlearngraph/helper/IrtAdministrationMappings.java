package com.adaptlearngraph.helper;

import com.adaptlearngraph.dtos.IrtAdministrationDto.CandidateView;
import com.adaptlearngraph.dtos.IrtAdministrationDto.ItemFitResponse;
import com.adaptlearngraph.dtos.IrtAdministrationDto.ItemPinResponse;
import com.adaptlearngraph.dtos.IrtAdministrationDto.ResultResponse;
import com.adaptlearngraph.dtos.IrtAdministrationDto.RunView;
import com.adaptlearngraph.dtos.IrtAdministrationDto.ScopeResponse;
import com.adaptlearngraph.dtos.IrtAdministrationDto.SelectionResponse;
import com.adaptlearngraph.dtos.IrtAdministrationDto.SkillFitResponse;
import com.adaptlearngraph.entities.domain.Calibration.Candidate;
import com.adaptlearngraph.entities.domain.Calibration.ItemFit;
import com.adaptlearngraph.entities.domain.Calibration.ItemPin;
import com.adaptlearngraph.entities.domain.Calibration.Result;
import com.adaptlearngraph.entities.domain.Calibration.Run;
import com.adaptlearngraph.entities.domain.Calibration.Scope;
import com.adaptlearngraph.entities.domain.Calibration.SkillFit;
import com.adaptlearngraph.repository.PromotionPorts.Selection;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import org.modelmapper.ModelMapper;
import org.modelmapper.spi.MappingContext;

/**
 * TypeMaps for the IRT administration API. Runs expose only the envelope origin and diagnostics without the worker
 * lease ({@code workerToken}, {@code expiresAt}); candidates never expose their envelope (actor, pins, model approval).
 */
public final class IrtAdministrationMappings implements ModelMapperRegistrar {
    @Override
    public void register(ModelMapper mapper) {
        mapper.typeMap(Run.class, RunView.class).setConverter(context -> {
            Run source = context.getSource();
            var diagnostics = new TreeMap<>(source.diagnostics());
            diagnostics.remove("workerToken");
            diagnostics.remove("expiresAt");
            return new RunView(source.id(), name(source.status()), source.outputId(), name(source.envelope().origin()),
                    Map.copyOf(diagnostics), source.createdAt(), source.startedAt(), source.completedAt());
        });
        mapper.typeMap(ItemPin.class, ItemPinResponse.class).setConverter(context -> {
            ItemPin source = context.getSource();
            return new ItemPinResponse(source.itemVersionId(), source.itemId(), source.version(), source.skillId(),
                    source.contentHash());
        });
        mapper.typeMap(ItemFit.class, ItemFitResponse.class).setConverter(context -> {
            ItemFit source = context.getSource();
            return new ItemFitResponse(nested(context, source.pin(), ItemPinResponse.class), source.a(), source.b(), source.c(),
                    source.observations(), source.correct(), source.empiricalProportion(), source.predictedProportion(),
                    source.residual(), source.uncertainty(), source.cEstimated());
        });
        mapper.typeMap(SkillFit.class, SkillFitResponse.class).setConverter(context -> {
            SkillFit source = context.getSource();
            return new SkillFitResponse(source.skillId(), source.subjects(), source.iterations(), source.initialLogLikelihood(),
                    source.logLikelihood(), source.relativeChange(), source.parameterChange(), source.converged());
        });
        mapper.typeMap(Result.class, ResultResponse.class).setConverter(context -> {
            Result source = context.getSource();
            return new ResultResponse(name(source.origin()), source.algorithm(), source.algorithmHash(), source.datasetHash(),
                    source.generatingHash(), source.seed(), list(context, source.items(), ItemFitResponse.class),
                    list(context, source.skills(), SkillFitResponse.class), source.objectiveEvaluations());
        });
        mapper.typeMap(Candidate.class, CandidateView.class).setConverter(context -> {
            Candidate source = context.getSource();
            return new CandidateView(source.id(), source.modelId(), source.source(), source.status(), source.parameterHash(),
                    nested(context, source.result(), ResultResponse.class), source.createdAt(), source.activatedBy(),
                    source.activatedAt());
        });
        mapper.typeMap(Scope.class, ScopeResponse.class).setConverter(context -> {
            Scope source = context.getSource();
            return new ScopeResponse(source.organizationId(), source.bankId(), source.modelId());
        });
        mapper.typeMap(Selection.class, SelectionResponse.class).setConverter(context -> {
            Selection source = context.getSource();
            return new SelectionResponse(nested(context, source.scope(), ScopeResponse.class), source.revision(),
                    source.parameterSetId(), source.parameterHash(), source.actorId(), source.selectedAt());
        });
    }

    private static String name(Enum<?> value) {
        return value == null ? null : value.name();
    }

    private static <D> D nested(MappingContext<?, ?> context, Object source, Class<D> type) {
        return source == null ? null : context.getMappingEngine().map(context.create(source, type));
    }

    private static <D> List<D> list(MappingContext<?, ?> context, List<?> source, Class<D> type) {
        return source == null ? null : source.stream().map(item -> nested(context, item, type)).toList();
    }
}