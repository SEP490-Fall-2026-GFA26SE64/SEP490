package com.adaptlearngraph.helper;

import com.adaptlearngraph.dtos.AssessmentPolicyDto.PageResponse;
import com.adaptlearngraph.dtos.AssessmentPolicyDto.PinResponse;
import com.adaptlearngraph.dtos.AssessmentPolicyDto.SavedResponse;
import com.adaptlearngraph.dtos.AssessmentPolicyDto.StateResponse;
import com.adaptlearngraph.dtos.AssessmentPolicyDto.ValuesResponse;
import com.adaptlearngraph.dtos.AssessmentPolicyDto.VersionResponse;
import com.adaptlearngraph.entities.domain.OrganizationAssessmentPolicy.Page;
import com.adaptlearngraph.entities.domain.OrganizationAssessmentPolicy.Pin;
import com.adaptlearngraph.entities.domain.OrganizationAssessmentPolicy.Saved;
import com.adaptlearngraph.entities.domain.OrganizationAssessmentPolicy.State;
import com.adaptlearngraph.entities.domain.OrganizationAssessmentPolicy.Values;
import com.adaptlearngraph.entities.domain.OrganizationAssessmentPolicy.Version;
import org.modelmapper.ModelMapper;
import org.modelmapper.spi.MappingContext;

/** TypeMaps for the organization assessment policy API (own organization only). */
public final class AssessmentPolicyMappings implements ModelMapperRegistrar {
    @Override
    public void register(ModelMapper mapper) {
        mapper.typeMap(Values.class, ValuesResponse.class).setConverter(context -> {
            Values source = context.getSource();
            return new ValuesResponse(source.stopSe(), source.highConfidenceSe(), source.mediumConfidenceSe(), source.k());
        });
        mapper.typeMap(Pin.class, PinResponse.class).setConverter(context -> {
            Pin source = context.getSource();
            return new PinResponse(source.organizationId(), source.versionId(), source.hash(),
                    nested(context, source.values(), ValuesResponse.class));
        });
        mapper.typeMap(Version.class, VersionResponse.class).setConverter(context -> {
            Version source = context.getSource();
            return new VersionResponse(nested(context, source.pin(), PinResponse.class), source.version(),
                    source.createdBy(), source.createdAt());
        });
        mapper.typeMap(State.class, StateResponse.class).setConverter(context -> {
            State source = context.getSource();
            return new StateResponse(nested(context, source.active(), VersionResponse.class), source.activationRevision());
        });
        mapper.typeMap(Page.class, PageResponse.class).setConverter(context -> {
            Page source = context.getSource();
            return new PageResponse(source.items().stream().map(item -> nested(context, item, VersionResponse.class)).toList(),
                    source.total(), source.page(), source.size());
        });
        mapper.typeMap(Saved.class, SavedResponse.class).setConverter(context -> {
            Saved source = context.getSource();
            return new SavedResponse(nested(context, source.version(), VersionResponse.class), source.noOp());
        });
    }

    private static <D> D nested(MappingContext<?, ?> context, Object source, Class<D> type) {
        return source == null ? null : context.getMappingEngine().map(context.create(source, type));
    }
}