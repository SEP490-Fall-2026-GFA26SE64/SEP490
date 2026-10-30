package com.adaptlearngraph.pathway.infrastructure;

import java.lang.reflect.*;
import java.sql.*;
import java.util.concurrent.atomic.AtomicLong;
import javax.sql.DataSource;
import org.springframework.jdbc.datasource.DelegatingDataSource;

/** Counts actual prepared statements while delegating every operation to the real JDBC connection. */
final class CountingTestDataSource extends DelegatingDataSource {
    private final AtomicLong prepared;
    CountingTestDataSource(DataSource target,AtomicLong prepared){super(target);this.prepared=prepared;}
    @Override public Connection getConnection() throws SQLException{return counted(super.getConnection());}
    @Override public Connection getConnection(String user,String password)throws SQLException{return counted(super.getConnection(user,password));}
    private Connection counted(Connection delegate){return (Connection)Proxy.newProxyInstance(Connection.class.getClassLoader(),new Class<?>[]{Connection.class},(proxy,method,args)->{
        if(method.getName().equals("equals"))return proxy==args[0];
        if(method.getName().equals("hashCode"))return System.identityHashCode(proxy);
        if(method.getName().equals("prepareStatement") || method.getName().equals("prepareCall"))prepared.incrementAndGet();
        try{return method.invoke(delegate,args);}catch(InvocationTargetException failure){throw failure.getCause();}
    });}
}
