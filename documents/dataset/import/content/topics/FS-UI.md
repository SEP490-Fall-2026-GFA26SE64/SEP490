# Connecting interface meaning and behaviour

Content version 1.0. Local authored introduction awaiting expert review.

## Explanation

An interface must communicate structure and expose usable interaction states. Choose elements for their meaning, then adapt layout to the viewport. Treat loading, success and failure as separate states. Verify the journey with keyboard input and do not rely only on visual appearance to convey an error.

## Worked example

A Save control should perform an action and be usable without a pointer. While saving, show a clear pending state. If the request fails, keep the entered values and explain how to retry. Test a narrow viewport and a keyboard-only journey; a screenshot alone cannot show whether focus works.

This is an illustrative teaching scenario, not a measured learner result.

## Check your understanding

What does a successful visual review fail to prove?

Answer: It does not prove keyboard access, request error handling or the meaning exposed to assistive technology.

## Official learning resources

- [MDN accessible HTML](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Accessibility/HTML)
- [MDN responsive design](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design)
- [MDN Fetch guide](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)

These links supplement the local lesson. They do not imply endorsement of this course. Resource selection reviewed 12 October 2026.
