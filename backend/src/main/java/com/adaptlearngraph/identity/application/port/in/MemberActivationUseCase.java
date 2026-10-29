package com.adaptlearngraph.identity.application.port.in;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public interface MemberActivationUseCase {
    Invitation invite(UUID organizationId,Input input);
    List<Reference> references(UUID organizationId);
    List<PendingActivation> pending(UUID organizationId);
    void activate(String token,String password,String address);
    record Input(String fullName,String email,Set<String> roles,UUID departmentId,UUID occupationReferenceId) {}
    record Invitation(UUID activationId,String email,Instant expiresAt,String deliveryStatus) {}
    record Reference(UUID departmentId,String departmentName,UUID occupationReferenceId,String occupationName) {}
    record PendingActivation(UUID activationId,String fullName,String email,Set<String> roles,
                             UUID departmentId,String departmentName,UUID occupationReferenceId,String occupationName,
                             Instant createdAt,Instant expiresAt,String state,String deliveryStatus) {}
}
