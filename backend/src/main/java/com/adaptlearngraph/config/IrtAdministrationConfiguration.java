package com.adaptlearngraph.config;

import com.adaptlearngraph.entities.Calibration;
import com.adaptlearngraph.entities.CalibrationPolicy;
import com.adaptlearngraph.helper.CalibrationJson;
import com.adaptlearngraph.repository.CalibrationPorts;
import com.adaptlearngraph.repository.JdbcCalibrationInputSource;
import com.adaptlearngraph.repository.JdbcCalibrationStore;
import com.adaptlearngraph.repository.JdbcParameterPromotionStore;
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
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

/** Default off. Enabling without owner Identity/readiness/approved dataset registry fails startup, never creates a principal. */
@Configuration(proxyBeanMethods=false)
@ConditionalOnProperty(prefix="assessment.baseline.irt-administration",name="enabled",havingValue="true")
public class IrtAdministrationConfiguration {
    @Bean CalibrationJson calibrationJson() { return new CalibrationJson(CalibrationPolicy.syntheticV2()); }
    @Bean JdbcCalibrationStore calibrationStore(DataSource dataSource,CalibrationJson json) { return new JdbcCalibrationStore(dataSource,json); }
    @Bean InputSource calibrationInputSource(DataSource dataSource,DatasetSource datasets,CalibrationJson json,
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
        return new JdbcCalibrationInputSource(new NamedParameterJdbcTemplate(dataSource),
                source,datasets,json);
    }
    @Bean CalibrationPorts.UseCase calibrationUseCase(Authorization authorization,InputSource inputs,JdbcCalibrationStore store,CalibrationJson json) {
        return new CalibrationService(authorization,inputs,store,(bank,data,dataHash,algorithmHash,budget)->
                new MmlCalibrationEngine(json.policyFor(algorithmHash)).fit(bank,data,dataHash,algorithmHash,budget),json);
    }
    @Bean PromotionPorts.UseCase parameterPromotionUseCase(Authorization authorization,Readiness readiness,DataSource dataSource,
            JdbcCalibrationStore runs,CalibrationJson json) {
        return new PromotionService(authorization,new JdbcParameterPromotionStore(runs,new NamedParameterJdbcTemplate(dataSource),json),readiness,json);
    }
}
