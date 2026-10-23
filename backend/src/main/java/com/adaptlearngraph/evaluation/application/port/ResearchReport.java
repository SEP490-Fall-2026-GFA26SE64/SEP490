package com.adaptlearngraph.evaluation.application.port;
import com.adaptlearngraph.evaluation.domain.Research.Run;
public interface ResearchReport { byte[] pdf(Run run); String rules(); }
