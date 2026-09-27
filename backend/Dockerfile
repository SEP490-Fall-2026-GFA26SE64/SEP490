FROM maven:3.9.11-eclipse-temurin-21 AS build
WORKDIR /workspace/backend
COPY backend/pom.xml ./
COPY backend/src ./src
RUN mvn -B -ntp -DskipTests package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /workspace/backend/target/adapt-learn-graph.jar app.jar
USER app
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]