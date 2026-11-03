package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.IrtAdministrationDto.CandidateView;
import com.adaptlearngraph.dtos.IrtAdministrationDto.PromoteRequest;
import com.adaptlearngraph.dtos.IrtAdministrationDto.RunRequest;
import com.adaptlearngraph.dtos.IrtAdministrationDto.RunView;
import com.adaptlearngraph.dtos.IrtAdministrationDto.SelectionResponse;
import com.adaptlearngraph.entities.domain.Calibration;
import com.adaptlearngraph.entities.domain.Calibration.Code;
import com.adaptlearngraph.entities.domain.Calibration.Request;
import com.adaptlearngraph.entities.domain.Calibration.Run;
import com.adaptlearngraph.entities.domain.Calibration.Scope;
import com.adaptlearngraph.entities.domain.Calibration.Source;
import com.adaptlearngraph.repository.CalibrationPorts;
import com.adaptlearngraph.repository.CalibrationPorts.Action;
import com.adaptlearngraph.repository.CalibrationPorts.Authorization;
import com.adaptlearngraph.repository.CalibrationPorts.Decoding;
import com.adaptlearngraph.repository.PromotionPorts;
import java.io.IOException;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Supplier;
import org.modelmapper.ModelMapper;

/**
 * DTO boundary of the IRT administration API. The organization and actor come only from the trusted authorization
 * port; the path bank/model must match the granted scope before any body is read. Calibration failures are
 * translated into {@link Failure} with the same code and message.
 */
public class IrtAdministrationApplicationService {
    private static final int MAX_BODY_BYTES = 65_536;

    /** Lazily opened request body, read only after authorization. */
    @FunctionalInterface
    public interface Body {
        InputStream open() throws IOException;
    }

    /** HTTP-safe calibration rejection: the calibration code name and its message. */
    public static final class Failure extends RuntimeException {
        private final String code;

        public Failure(String code, String message) {
            super(message);
            this.code = Objects.requireNonNull(code, "code");
        }

        public static Failure invalidInput() {
            return of(new Calibration.Failure(Code.INVALID_INPUT));
        }

        private static Failure of(Calibration.Failure failure) {
            return new Failure(failure.code().name(), failure.getMessage());
        }

        public String code() {
            return code;
        }
    }

    private final Authorization authorization;
    private final CalibrationPorts.UseCase calibration;
    private final PromotionPorts.UseCase promotion;
    private final Decoding json;
    private final ModelMapper mapper;

    public IrtAdministrationApplicationService(Authorization authorization, CalibrationPorts.UseCase calibration,
            PromotionPorts.UseCase promotion, Decoding json, ModelMapper mapper) {
        this.authorization = Objects.requireNonNull(authorization, "authorization");
        this.calibration = Objects.requireNonNull(calibration, "calibration");
        this.promotion = Objects.requireNonNull(promotion, "promotion");
        this.json = Objects.requireNonNull(json, "json");
        this.mapper = Objects.requireNonNull(mapper, "mapper");
    }

    public RunView run(UUID bankId, UUID modelId, long contentLength, Body body) {
        return guard(() -> {
            Scope scope = scope(bankId, modelId, Action.CALIBRATE);
            RunRequest r = decode(contentLength, body, RunRequest.class);
            var source = new Source(r.source().bankId(), r.source().manifestVersion(), r.source().manifestHash(),
                    r.source().scopeHash(), r.source().ontologyHash());
            return view(calibration.execute(new Request(r.runId(), scope, source, r.datasetRef(), r.datasetHash(),
                    r.modelConfigurationHash(), r.modelParameterHash(), r.algorithmHash())));
        });
    }

    public RunView read(UUID bankId, UUID modelId, UUID runId) {
        return guard(() -> view(calibration.read(scope(bankId, modelId, Action.READ), runId)));
    }

    public CandidateView candidate(UUID bankId, UUID modelId, UUID candidateId) {
        return guard(() -> map(calibration.candidate(scope(bankId, modelId, Action.READ), candidateId), CandidateView.class));
    }

    public RunView recoverExpired(UUID bankId, UUID modelId, UUID runId) {
        return guard(() -> view(calibration.recoverExpired(scope(bankId, modelId, Action.CALIBRATE), runId)));
    }

    public RunView cancel(UUID bankId, UUID modelId, UUID runId) {
        return guard(() -> view(calibration.cancel(scope(bankId, modelId, Action.CALIBRATE), runId)));
    }

    public SelectionResponse promote(UUID bankId, UUID modelId, String idempotencyKey, long contentLength, Body body) {
        return guard(() -> {
            Scope scope = scope(bankId, modelId, Action.PROMOTE);
            PromoteRequest p = decode(contentLength, body, PromoteRequest.class);
            var command = new PromotionPorts.Command(scope, p.candidateId(), p.parameterHash(), p.modelConfigurationHash(),
                    p.modelParameterHash(), p.expectedRevision(), p.expectedParameterSetId(), idempotencyKey, p.reason());
            return map(promotion.promote(command), SelectionResponse.class);
        });
    }

    private Scope scope(UUID bank, UUID model, Action action) {
        Scope scope = authorization.currentScope(bank, model);
        if (scope == null || !bank.equals(scope.bankId()) || !model.equals(scope.modelId())) {
            throw new Calibration.Failure(Code.FORBIDDEN);
        }
        if (!scope.equals(authorization.require(scope, action).scope())) throw new Calibration.Failure(Code.FORBIDDEN);
        return scope;
    }

    private <T> T decode(long contentLength, Body body, Class<T> type) {
        Calibration.require(contentLength <= MAX_BODY_BYTES);
        try (InputStream input = body.open()) {
            byte[] bytes = input.readNBytes(MAX_BODY_BYTES + 1);
            Calibration.require(bytes.length <= MAX_BODY_BYTES);
            String text = StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT).onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(bytes)).toString();
            return json.read(text, type);
        } catch (IOException invalid) {
            throw new Calibration.Failure(Code.INVALID_INPUT);
        }
    }

    private RunView view(Run run) {
        return map(run, RunView.class);
    }

    private <D> D map(Object source, Class<D> type) {
        return source == null ? null : mapper.map(source, type);
    }

    private static <T> T guard(Supplier<T> work) {
        try {
            return work.get();
        } catch (Calibration.Failure failure) {
            throw Failure.of(failure);
        }
    }
}