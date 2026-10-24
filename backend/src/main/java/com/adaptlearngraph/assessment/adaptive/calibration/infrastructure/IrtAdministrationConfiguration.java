package com.adaptlearngraph.assessment.adaptive.calibration.infrastructure;

import com.adaptlearngraph.assessment.adaptive.calibration.application.*;
import com.adaptlearngraph.assessment.adaptive.calibration.application.CalibrationPorts.*;
import com.adaptlearngraph.assessment.adaptive.calibration.application.PromotionPorts.Readiness;
import com.adaptlearngraph.assessment.adaptive.calibration.domain.*;
import com.adaptlearngraph.assessment.infrastructure.OfficialCalibrationBankSource;
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
    @Bean CalibrationJson calibrationJson() { return new CalibrationJson(); }
    @Bean JdbcCalibrationStore calibrationStore(DataSource dataSource,CalibrationJson json) { return new JdbcCalibrationStore(dataSource,json); }
    @Bean InputSource calibrationInputSource(DataSource dataSource,DatasetSource datasets,CalibrationJson json,
            @Value("${assessment.baseline.irt-administration.repository-root}") String repositoryRoot) {
        return new JdbcCalibrationInputSource(new NamedParameterJdbcTemplate(dataSource),
                new OfficialCalibrationBankSource(java.nio.file.Path.of(repositoryRoot)),datasets,json);
    }
    @Bean CalibrationPorts.UseCase calibrationUseCase(Authorization authorization,InputSource inputs,JdbcCalibrationStore store,CalibrationJson json) {
        return new CalibrationService(authorization,inputs,store,new MmlCalibrationEngine(CalibrationPolicy.syntheticV1())::fit,json);
    }
    @Bean PromotionPorts.UseCase parameterPromotionUseCase(Authorization authorization,Readiness readiness,DataSource dataSource,
            JdbcCalibrationStore runs,CalibrationJson json) {
        return new PromotionService(authorization,new JdbcParameterPromotionStore(runs,new NamedParameterJdbcTemplate(dataSource),json),readiness,json);
    }
}
