package com.adaptlearngraph.helper;

import com.adaptlearngraph.dtos.RegistrationDto.EnrollmentResponse;
import com.adaptlearngraph.dtos.RegistrationDto.FieldsResponse;
import com.adaptlearngraph.dtos.RegistrationDto.ViewResponse;
import com.adaptlearngraph.entities.domain.RegistrationFields;
import com.adaptlearngraph.services.RegistrationUseCase;
import org.modelmapper.ModelMapper;

/** TypeMaps for the registration API; only the public projection of the registration and enrollment is mapped. */
public final class RegistrationMappings implements ModelMapperRegistrar {
    @Override
    public void register(ModelMapper mapper) {
        mapper.typeMap(RegistrationFields.class, FieldsResponse.class).setConverter(context -> {
            RegistrationFields source = context.getSource();
            return new FieldsResponse(source.organizationName(), source.subdomain(), source.industry(),
                    source.headcount(), source.adminName(), source.adminEmail());
        });
        mapper.typeMap(RegistrationUseCase.View.class, ViewResponse.class).setConverter(context -> {
            RegistrationUseCase.View source = context.getSource();
            FieldsResponse fields = source.fields() == null ? null
                    : context.getMappingEngine().map(context.create(source.fields(), FieldsResponse.class));
            return new ViewResponse(source.registrationId(), source.stage(), source.email(), fields,
                    source.deliveryStatus(), source.resendAvailableAt(), source.emailVerifiedAt(), source.completedAt());
        });
        mapper.typeMap(RegistrationUseCase.Enrollment.class, EnrollmentResponse.class).setConverter(context -> {
            RegistrationUseCase.Enrollment source = context.getSource();
            return new EnrollmentResponse(source.manualSecret(), source.email());
        });
    }
}