package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.Calibration.*;
import com.adaptlearngraph.entities.CalibrationBudget;

/** No persistence, driver, answer DTO or generating parameters cross this numerical boundary. */
public interface CalibrationEnginePort {
    Result fit(Bank bank, Dataset observed, String datasetHash, String algorithmHash, CalibrationBudget budget);
}
