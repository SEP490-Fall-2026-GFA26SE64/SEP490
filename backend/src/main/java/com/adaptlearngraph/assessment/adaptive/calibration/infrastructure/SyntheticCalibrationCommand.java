package com.adaptlearngraph.assessment.adaptive.calibration.infrastructure;

import com.adaptlearngraph.assessment.adaptive.calibration.domain.*;
import com.adaptlearngraph.assessment.adaptive.calibration.domain.Calibration.*;
import com.adaptlearngraph.assessment.infrastructure.OfficialCalibrationBankSource;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Map;

/** Standalone main-only offline operation; no Spring context, database, actor, model provisioning or test runner. */
public final class SyntheticCalibrationCommand {
    private SyntheticCalibrationCommand() {}
    public static void main(String[] args) throws Exception {
        if (args.length!=3 || !"--synthetic-only".equals(args[0])) throw new IllegalArgumentException("Expected --synthetic-only <repository-root> <output-directory>");
        Path root=Path.of(args[1]).toAbsolutePath().normalize(),output=Path.of(args[2]).toAbsolutePath().normalize();
        Calibration.require(output.startsWith(root.resolve("documents/dataset/calibration")) && !Files.exists(output));
        var json=new CalibrationJson(); var policy=CalibrationPolicy.syntheticV1(); var budget=new CalibrationBudget(policy);
        var bank=new OfficialCalibrationBankSource(root).load();
        var generated=new SyntheticResponseGenerator().generate(bank,json,budget);
        String datasetHash=json.hash(generated.dataset());
        Calibration.require(json.write(generated.dataset()).getBytes(StandardCharsets.UTF_8).length<=policy.maximumInputBytes());
        Files.createDirectories(output);
        write(output,"generating.json",json.write(generated.generating())); write(output,"responses.json",json.write(generated.dataset()));
        write(output,"policy.json",json.write(policy));
        long started=System.nanoTime();
        try {
            var fit=new MmlCalibrationEngine(policy).fit(bank,generated.dataset(),datasetHash,json.algorithmHash(),budget);
            String artifact=json.write(Map.of("kind","OFFLINE_SYNTHETIC_FIT_NOT_PERSISTED","source",bank.source(),"result",fit,
                    "operationalPromotionEligible",false,"modelPinStatus","MISSING_NO_MODEL_CREATED"));
            write(output,"fitted.json",artifact);
            write(output,"observation.json",json.write(Map.of("kind","BOUNDED_MANUAL_OFFLINE_OPERATION_NOT_TEST_EVIDENCE",
                    "status","SUCCEEDED","origin","SYNTHETIC","datasetHash",datasetHash,"generatingHash",generated.dataset().generatingHash(),
                    "algorithmHash",json.algorithmHash(),"fittedArtifactHash",CalibrationJson.bytesHash(artifact.getBytes(StandardCharsets.UTF_8)),
                    "elapsedMillis",(System.nanoTime()-started)/1_000_000,"itemCount",fit.items().size(),"objectiveEvaluations",fit.objectiveEvaluations())));
            System.out.println("OFFLINE_SYNTHETIC_FIT SUCCEEDED items="+fit.items().size()+" datasetHash="+datasetHash+"; no DB/model/promotion");
        } catch (Failure failure) {
            write(output,"observation.json",json.write(Map.of("kind","BOUNDED_MANUAL_OFFLINE_OPERATION_NOT_TEST_EVIDENCE",
                    "status","FAILED","reason",failure.code(),"origin","SYNTHETIC","datasetHash",datasetHash,
                    "algorithmHash",json.algorithmHash(),"elapsedMillis",(System.nanoTime()-started)/1_000_000)));
            System.out.println("OFFLINE_SYNTHETIC_FIT FAILED reason="+failure.code()+"; no candidate/DB/model/promotion");
        }
    }
    private static void write(Path directory,String name,String content) throws java.io.IOException {
        Files.writeString(directory.resolve(name),content,StandardCharsets.UTF_8,StandardOpenOption.CREATE_NEW);
    }
}
