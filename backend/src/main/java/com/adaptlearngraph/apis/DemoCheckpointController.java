package com.adaptlearngraph.apis;

import com.adaptlearngraph.repository.DemoCheckpointStore;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@Profile("local & !prod")
@ConditionalOnProperty(name="demo.checkpoint.enabled",havingValue="true")
@RequestMapping("/api/v1/demo/checkpoint")
public final class DemoCheckpointController {
    private final DemoCheckpointStore store;
    private final com.adaptlearngraph.services.BrightpathDemoMembers members;
    public DemoCheckpointController(DemoCheckpointStore store,com.adaptlearngraph.services.BrightpathDemoMembers members){this.store=store;this.members=members;}
    @PostMapping("/seed-members") public ResponseEntity<?> members(@RequestHeader("X-Demo-Capture-Token") String token) {
        store.authorizeFixture(token);if(!"NOT_CAPTURED".equals(store.state()))throw new IllegalStateException("Preserve captured checkpoint");
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(Map.of("created",members.seed(),"provenance","BRIGHTPATH_SECTION_3_FIXTURE"));
    }
    @PostMapping("/capture") public ResponseEntity<?> capture(@RequestHeader("X-Demo-Capture-Token") String token){store.capture(token);return status();}
    public record BaselineCheckpoint(java.util.UUID baselineAttemptId) {}
    @PostMapping("/capture-baseline") public ResponseEntity<?> baseline(@RequestHeader("X-Demo-Capture-Token") String token,@RequestBody BaselineCheckpoint input){store.captureBaseline(token,input.baselineAttemptId());return status();}
    @GetMapping("/status") public ResponseEntity<?> status(){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(Map.of("checkpoint",store.checkpoint(),"state",store.state()));}
    @ExceptionHandler(SecurityException.class) public ResponseEntity<?> denied(){return ResponseEntity.status(403).body(Map.of("code","FORBIDDEN"));}
    @ExceptionHandler(IllegalStateException.class) public ResponseEntity<?> incomplete(IllegalStateException failure){return ResponseEntity.status(409).body(Map.of("code","CHECKPOINT_INCOMPLETE","message",failure.getMessage()));}
}
