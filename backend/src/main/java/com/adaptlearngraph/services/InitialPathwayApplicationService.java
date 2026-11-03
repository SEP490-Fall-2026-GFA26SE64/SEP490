package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.InitialPathwayDto.OutcomeResponse;
import com.adaptlearngraph.repository.InitialPathwayPorts.Receipt;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.modelmapper.ModelMapper;

/**
 * HTTP-facing boundary of the initial-pathway employee and expert APIs. Actor, organization and learner are always
 * resolved from trusted context by the wrapped use cases; retained command receipts are returned as outcomes.
 */
public class InitialPathwayApplicationService {
    private final RoleGapPreview gaps;
    private final InitialPathwayAdmission admission;
    private final InitialPathwayReview review;
    private final InitialPathwayView view;
    private final ModelMapper mapper;

    public InitialPathwayApplicationService(RoleGapPreview gaps, InitialPathwayAdmission admission, InitialPathwayReview review,
            InitialPathwayView view, ModelMapper mapper) {
        this.gaps = Objects.requireNonNull(gaps, "gaps");
        this.admission = Objects.requireNonNull(admission, "admission");
        this.review = Objects.requireNonNull(review, "review");
        this.view = Objects.requireNonNull(view, "view");
        this.mapper = Objects.requireNonNull(mapper, "mapper");
    }

    public RoleGapPreview.Preview gaps(String roleId, String levelId) {
        return gaps.preview(roleId, levelId);
    }

    public OutcomeResponse confirm(String key, InitialPathwayAdmission.Confirm command) {
        return outcome(admission.confirm(key, command));
    }

    public InitialPathwayView.Status request(UUID id) {
        return view.request(id);
    }

    public InitialPathwayView.View current() {
        return view.current();
    }

    public InitialPathwayView.View archived(UUID id) {
        return view.archived(id);
    }

    public List<InitialPathwayReview.Summary> queue(int offset, int limit) {
        return review.queue(offset, limit);
    }

    public InitialPathwayReview.Detail detail(UUID id) {
        return review.detail(id);
    }

    public InitialPathwayReview.Checked validate(UUID id) {
        return review.validate(id);
    }

    public OutcomeResponse edit(UUID id, String key, InitialPathwayReview.Edit command, boolean include) {
        return outcome(review.edit(id, key, command, include));
    }

    public OutcomeResponse move(UUID id, String key, InitialPathwayReview.Move command) {
        return outcome(review.move(id, key, command));
    }

    public OutcomeResponse remove(UUID id, String key, InitialPathwayReview.Edit command) {
        return outcome(review.remove(id, key, command));
    }

    public OutcomeResponse approve(UUID id, String key, InitialPathwayReview.Expected expected) {
        return outcome(review.confirm(id, key, expected));
    }

    private OutcomeResponse outcome(Receipt receipt) {
        return mapper.map(Objects.requireNonNull(receipt, "receipt"), OutcomeResponse.class);
    }
}