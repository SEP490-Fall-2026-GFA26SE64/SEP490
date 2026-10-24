package com.adaptlearngraph.assessment.adaptive.calibration.application;

import com.adaptlearngraph.assessment.adaptive.calibration.domain.Calibration.*;
import com.adaptlearngraph.assessment.adaptive.calibration.domain.CalibrationBudget;

/** No persistence, driver, answer DTO or generating parameters cross this numerical boundary. */
public interface CalibrationEnginePort {
    Result fit(Bank bank, Dataset observed, String datasetHash, String algorithmHash, CalibrationBudget budget);
}
