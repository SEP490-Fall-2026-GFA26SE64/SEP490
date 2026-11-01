package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.SystemStatus;

public interface BuildInformationPort {
    SystemStatus read();
}