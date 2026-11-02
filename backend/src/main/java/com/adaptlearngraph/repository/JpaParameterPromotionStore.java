package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.AuditEventEntity;
import com.adaptlearngraph.entities.IrtEffectiveParameterSelectionEntity;
import com.adaptlearngraph.entities.IrtParameterPromotionCommandEntity;
import com.adaptlearngraph.helper.CalibrationJson;
import com.adaptlearngraph.repository.CalibrationPorts.Grant;
import com.adaptlearngraph.repository.PromotionPorts.*;
import com.adaptlearngraph.entities.Calibration;
import com.adaptlearngraph.entities.Calibration.*;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;

/** Requires forward V23 and trusted owner services. Candidate, pointer, original receipt and audit commit together. */
public final class JpaParameterPromotionStore implements Store {
    private final JpaCalibrationStore runs;
    private final IrtCalibrationRunJpaRepository clock;
    private final IrtCalibrationPinJpaRepository pins;
    private final IrtTechnicalVersionJpaRepository sets;
    private final IrtEffectiveParameterSelectionJpaRepository selections;
    private final IrtParameterPromotionCommandJpaRepository commands;
    private final AuditEventJpaRepository audit;
    private final CalibrationJson json;
    @SuppressWarnings("java:S107")
    public JpaParameterPromotionStore(JpaCalibrationStore runs,IrtCalibrationRunJpaRepository clock,IrtCalibrationPinJpaRepository pins,
            IrtTechnicalVersionJpaRepository sets,IrtEffectiveParameterSelectionJpaRepository selections,
            IrtParameterPromotionCommandJpaRepository commands,AuditEventJpaRepository audit,CalibrationJson json) {
        this.runs=runs; this.clock=clock; this.pins=pins; this.sets=sets; this.selections=selections; this.commands=commands;
        this.audit=audit; this.json=json;
    }
    @Override public <T> T transaction(Scope scope,Supplier<T> work) { return runs.transaction(scope,work); }
    @Override public Optional<Receipt> receipt(Grant grant,String key) {
        runs.require(grant.scope());
        return commands.receipt(grant.scope().organizationId(),grant.actorId(),key).map(row->new Receipt(row.requestHash(),
                new Selection(new Scope(row.organizationId(),row.questionBankId(),row.modelVersionId()),row.selectionRevision(),
                        row.parameterSetId(),row.parameterHash(),row.actorId(),row.occurredAt())));
    }
    @Override public Optional<Selection> effective(Scope scope) {
        runs.require(scope);
        return selections.lockEffective(scope.organizationId(),scope.bankId(),scope.modelId()).stream().map(row->new Selection(scope,
                ((Number) row[0]).longValue(),(UUID) row[1],(String) row[2],(UUID) row[3],AdaptiveAttemptRows.instant(row[4])))
                .toList().stream().findFirst();
    }
    @Override public Candidate candidate(Scope scope,UUID id) { return runs.candidate(scope,id); }
    @Override public void validatePins(Command command,Candidate candidate) {
        runs.require(command.scope());
        var scope=command.scope();
        var models=pins.irtModel(scope.modelId()).stream().map(row->{
            if (row[5]==null || row[6]==null) throw new Failure(Code.NOT_READY);
            String configuration=(String) row[1]; String parameterHash=(String) row[2];
            var runtime=json.read(configuration,com.adaptlearngraph.utility.AdaptiveIrtPolicy.Model.class);
            if(candidate.result().items().stream().anyMatch(item->item.a()<runtime.minA() || item.a()>runtime.maxA()
                    || StrictMath.abs(item.b())>runtime.maxAbsB() || item.c()>runtime.maxC()))throw new Failure(Code.NOT_READY);
            Calibration.require(json.hash(json.tree(configuration)).equals(command.modelConfigurationHash())
                    && parameterHash.equals(command.modelParameterHash()));
            Calibration.require(new ModelPin(scope.modelId(),(String) row[0],(String) row[3],parameterHash,
                    command.modelConfigurationHash(),(String) row[4],(UUID) row[5],
                    AdaptiveAttemptRows.instant(row[6])).equals(candidate.envelope().modelPin())); return true;
        }).toList();
        if (models.size()!=1) throw new Failure(Code.NOT_READY);
        if (pins.activeBankOwner(scope.bankId(),scope.organizationId()).size()!=1) throw new Failure(Code.FORBIDDEN);
        var byId=candidate.envelope().itemPins().stream().collect(java.util.stream.Collectors.toMap(ItemPin::itemVersionId,p->p));
        var seen=new java.util.HashSet<UUID>();
        for (Object[] row:pins.itemContents(scope.bankId(),byId.keySet())) {
            UUID id=(UUID) row[0]; ItemPin pin=byId.get(id);
            Calibration.require(pin!=null && seen.add(id) && pin.skillId().equals(row[1])
                    && pin.contentHash().equals(row[2]) && pin.contentHash().equals(json.hash(json.tree((String) row[3]))));
        }
        Calibration.require(seen.equals(byId.keySet()));
    }
    @Override public Selection promote(Grant grant,Command command,Candidate candidate,String requestHash) {
        runs.require(command.scope());
        var scope=command.scope();
        var now=AdaptiveAttemptRows.instant(clock.clockTimestamp());
        long revision=Math.addExact(command.expectedRevision(),1);
        if (sets.promote(candidate.id(),scope.modelId(),grant.actorId(),now)!=1) throw new Failure(Code.CONFLICT);
        if (command.expectedRevision()==0) {
            selections.insert(new IrtEffectiveParameterSelectionEntity(scope.organizationId(),scope.bankId(),scope.modelId(),candidate.id(),
                    1L,grant.actorId(),now));
        } else if (selections.advance(scope.organizationId(),scope.bankId(),scope.modelId(),candidate.id(),revision,grant.actorId(),now,
                command.expectedRevision(),command.expectedParameterSetId())!=1) throw new Failure(Code.CONFLICT);
        commands.insert(new IrtParameterPromotionCommandEntity(scope.organizationId(),grant.actorId(),command.idempotencyKey(),scope.bankId(),
                scope.modelId(),requestHash,candidate.id(),candidate.parameterHash(),command.expectedRevision(),command.expectedParameterSetId(),
                revision,command.reason(),now));
        UUID event=UUID.randomUUID();
        audit.insert(new AuditEventEntity(event,grant.actorId(),"assessment","IRT_PARAMETER_PROMOTED",candidate.id(),Long.toString(revision),
                now,"SUCCEEDED",event));
        return new Selection(scope,revision,candidate.id(),candidate.parameterHash(),grant.actorId(),now);
    }
}
