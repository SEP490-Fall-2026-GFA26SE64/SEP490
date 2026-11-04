package com.adaptlearngraph.services;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public interface MemberActivationUseCase {
    Invitation invite(UUID organizationId,Input input);
    List<Reference> references(UUID organizationId);
    List<PendingActivation> pending(UUID organizationId);
    void activate(String token,String password,String address);
    record Input(String fullName,String email,Set<String> roles,UUID departmentId,UUID jobPositionReferenceId,String departmentName,String jobPositionName) { public Input(String fullName,String email,Set<String> roles,UUID departmentId,UUID jobPositionReferenceId) { this(fullName,email,roles,departmentId,jobPositionReferenceId,null,null); } }
    record Invitation(UUID activationId,String email,Instant expiresAt,String deliveryStatus) {}
    record Reference(UUID departmentId,String departmentName,UUID jobPositionReferenceId,String jobPositionName) {}
    record PendingActivation(UUID activationId,String fullName,String email,Set<String> roles,
                             UUID departmentId,String departmentName,UUID jobPositionReferenceId,String jobPositionName,
                             Instant createdAt,Instant expiresAt,String state,String deliveryStatus) {}
}
