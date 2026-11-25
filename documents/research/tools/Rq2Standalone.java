import com.adaptlearngraph.dtos.GraphBenchmarkDto.BenchmarkRequest;
import com.adaptlearngraph.services.PlatformGraphBenchmarkService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Path;

class Rq2Standalone {
    public static void main(String[] args) throws Exception {
        if (args.length != 2) throw new IllegalArgumentException("Usage: Rq2Standalone <1k|5k|10k> <result.json>");
        var mapper = new ObjectMapper();
        // The measurement path uses its dedicated Neo4j endpoint, not the application driver.
        var benchmark = new PlatformGraphBenchmarkService(null, mapper);
        var result = benchmark.runBenchmark(new BenchmarkRequest(args[0], 1, 100, 50, 3, 5, true));
        mapper.writerWithDefaultPrettyPrinter().writeValue(Path.of(args[1]).toFile(), result);
        System.out.printf("%s: %d nodes, %d relationships, %d queries%n",
                args[0], result.catalogNodes(), result.catalogRelationships(), result.totalRuns());
    }
}
