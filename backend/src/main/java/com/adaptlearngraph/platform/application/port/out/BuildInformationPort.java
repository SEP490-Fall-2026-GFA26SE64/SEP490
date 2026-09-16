package com.adaptlearngraph.platform.application.port.out;

import com.adaptlearngraph.platform.domain.SystemStatus;

public interface BuildInformationPort {
    SystemStatus read();
}