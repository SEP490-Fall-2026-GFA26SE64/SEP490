package com.adaptlearngraph.config;

import com.adaptlearngraph.entities.Calibration;
import com.adaptlearngraph.entities.CalibrationPolicy;
import com.adaptlearngraph.helper.CalibrationJson;
import com.adaptlearngraph.repository.CalibrationPorts;
import com.adaptlearngraph.repository.AuditEventJpaRepository;
import com.adaptlearngraph.repository.IrtCalibrationPinJpaRepository;
import com.adaptlearngraph.repository.IrtCalibrationRunJpaRepository;
import com.adaptlearngraph.repository.IrtEffectiveParameterSelectionJpaRepository;
import com.adaptlearngraph.repository.IrtItemParameterJpaRepository;
import com.adaptlearngraph.repository.IrtParameterPromotionCommandJpaRepository;
import com.adaptlearngraph.repository.IrtTechnicalVersionJpaRepository;
import com.adaptlearngraph.repository.JpaCalibrationInputSource;
import com.adaptlearngraph.repository.JpaCalibrationStore;
import com.adaptlearngraph.repository.JpaParameterPromotionStore;
import com.adaptlearngraph.repository.PostgresAdvisoryLocks;
import com.adaptlearngraph.repository.PromotionPorts;
import com.adaptlearngraph.services.CalibrationService;
import com.adaptlearngraph.services.MmlCalibrationEngine;
import com.adaptlearngraph.services.PromotionService;
import com.adaptlearngraph.repository.CalibrationPorts.*;
import com.adaptlearngraph.repository.PromotionPorts.Readiness;
import com.adaptlearngraph.repository.OfficialCalibrationBankSource;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

/** Default off. Enabling without owner Identity/readiness/approved dataset registry fails startup, never creates a principal. */
@Configuration(proxyBeanMethods=false)
@ConditionalOnProperty(prefix="assessment.baseline.irt-administration",name="enabled",havingValue="true")
@Import(PersistenceConfiguration.class)
public class IrtAdministrationConfiguration {
    @Bean CalibrationJson calibrationJson() { return new CalibrationJson(CalibrationPolicy.syntheticV2()); }
    @SuppressWarnings("java:S107")
    @Bean JpaCalibrationStore calibrationStore(DataSource dataSource,IrtCalibrationRunJpaRepository runs,IrtCalibrationPinJpaRepository pins,
            IrtTechnicalVersionJpaRepository parameterSets,IrtItemParameterJpaRepository itemParameters,PostgresAdvisoryLocks locks,
            CalibrationJson json,
            @org.springframework.beans.factory.annotation.Qualifier(com.adaptlearngraph.constants.TransactionManagers.JPA)
            org.springframework.transaction.PlatformTransactionManager transactionManager) {
        return new JpaCalibrationStore(dataSource,runs,pins,parameterSets,itemParameters,locks,json,transactionManager);
    }
    @Bean InputSource calibrationInputSource(IrtCalibrationPinJpaRepository pins,DatasetSource datasets,CalibrationJson json,
            @Value("${assessment.baseline.irt-administration.repository-root:}") String repositoryRoot,
            org.springframework.beans.factory.ObjectProvider<BankSource> banks) {
        BankSource source=banks.getIfAvailable(()->(grant,expected)->{
            // Retained exact V1 source only. Generic organizations require their owner BankSource.
            if(repositoryRoot.isBlank())throw new Calibration.Failure(Calibration.Code.NOT_READY);
            var bank=new OfficialCalibrationBankSource(java.nio.file.Path.of(repositoryRoot)).load();
            if(!bank.source().equals(expected) || !bank.source().bankId().equals(grant.scope().bankId()))
                throw new Calibration.Failure(Calibration.Code.NOT_READY);
            return bank;
        });
        return new JpaCalibrationInputSource(pins,source,datasets,json);
    }
    @Bean CalibrationPorts.UseCase calibrationUseCase(Authorization authorization,InputSource inputs,JpaCalibrationStore store,CalibrationJson json) {
        return new CalibrationService(authorization,inputs,store,(bank,data,dataHash,algorithmHash,budget)->
                new MmlCalibrationEngine(json.policyFor(algorithmHash)).fit(bank,data,dataHash,algorithmHash,budget),json);
    }
    @SuppressWarnings("java:S107")
    @Bean PromotionPorts.UseCase parameterPromotionUseCase(Authorization authorization,Readiness readiness,JpaCalibrationStore runs,
            IrtCalibrationRunJpaRepository clock,IrtCalibrationPinJpaRepository pins,IrtTechnicalVersionJpaRepository sets,
            IrtEffectiveParameterSelectionJpaRepository selections,IrtParameterPromotionCommandJpaRepository commands,
            AuditEventJpaRepository audit,CalibrationJson json) {
        return new PromotionService(authorization,new JpaParameterPromotionStore(runs,clock,pins,sets,selections,commands,audit,json),readiness,json);
    }
}
