package com.adaptlearngraph.helper;

import com.adaptlearngraph.dtos.JobPositionResponse;
import com.adaptlearngraph.entities.domain.JobPosition;
import org.modelmapper.ModelMapper;

/** TypeMaps for the organization job position catalog API. */
public final class JobPositionMappings implements ModelMapperRegistrar {
    @Override
    public void register(ModelMapper mapper) {
        mapper.typeMap(JobPosition.class, JobPositionResponse.class).setConverter(context -> {
            JobPosition source = context.getSource();
            return new JobPositionResponse(
                    source.id(),
                    source.code(),
                    source.name(),
                    source.jobZone(),
                    source.interestRealistic(),
                    source.interestInvestigative(),
                    source.interestArtistic(),
                    source.interestSocial(),
                    source.interestEnterprising(),
                    source.interestConventional(),
                    source.status(),
                    source.version(),
                    source.roleCount(),
                    source.microSkillCount());
        });
    }
}

