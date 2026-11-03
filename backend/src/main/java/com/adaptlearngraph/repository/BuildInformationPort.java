package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.SystemStatus;

public interface BuildInformationPort {
    SystemStatus read();
}