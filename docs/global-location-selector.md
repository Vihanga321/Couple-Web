# Global location selector

Twonara uses the same persistent `twonara:location` value across the application.

- Home: the main Sri Lanka location dropdown appears directly below search.
- Other customer pages: the same selector appears in the global sticky header.
- Business/Admin portals: the selector remains available so the chosen customer discovery area is preserved when returning to the customer site.

Changing the selector dispatches the existing `twonara:persistent-state` event, so Explore, Gifts, Date Plan and other location-aware views update without maintaining separate location values.
