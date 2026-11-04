package com.adaptlearngraph.helper;

import com.adaptlearngraph.dtos.DepartmentResponse;
import com.adaptlearngraph.entities.domain.Department;
import org.modelmapper.ModelMapper;

/** TypeMaps for the organization department catalog API. */
public final class DepartmentMappings implements ModelMapperRegistrar {
    @Override
    public void register(ModelMapper mapper) {
        mapper.typeMap(Department.class, DepartmentResponse.class).setConverter(context -> {
            Department source = context.getSource();
            return new DepartmentResponse(
                    source.id(),
                    source.code(),
                    source.name(),
                    source.description(),
                    source.headOfDepartment(),
                    source.headEmail(),
                    source.status(),
                    source.organizationId(),
                    source.createdAt(),
                    source.updatedAt(),
                    source.jobPositionCodes(),
                    source.jobPositionCount());
        });
    }
}

