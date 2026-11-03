package com.adaptlearngraph.helper;

import com.adaptlearngraph.dtos.OccupationResponse;
import com.adaptlearngraph.entities.domain.Occupation;
import org.modelmapper.ModelMapper;

/** TypeMaps for the organization occupation catalog API. */
public final class OccupationMappings implements ModelMapperRegistrar {
    @Override
    public void register(ModelMapper mapper) {
        mapper.typeMap(Occupation.class, OccupationResponse.class).setConverter(context -> {
            Occupation source = context.getSource();
            return new OccupationResponse(
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