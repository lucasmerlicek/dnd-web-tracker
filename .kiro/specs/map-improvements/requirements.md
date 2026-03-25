# Requirements Document

## Introduction

This feature improves the interactive map viewer in the D&D web tracker. Four areas are addressed: marker placement UX (switching from single-click to double-click), zoom-consistent marker sizing, correcting Aetherion floor images (per-floor PNGs and expanded floor count), and fixing the Aetherion map container so its border frame matches Valerion's dimensions.

## Glossary

- **Map_Viewer**: The interactive map page (`src/src/app/map/page.tsx`) that displays Valerion and Aetherion maps with pan/zoom and marker management.
- **Marker**: A categorized pin placed on the map at a percentage-based x/y position, stored in Vercel KV.
- **Creation_Form**: The UI panel displayed below the map that collects title, description, and category for a new marker.
- **Zoom_Level**: The current scale factor applied by the `react-zoom-pan-pinch` TransformWrapper, ranging from 0.5 to 4.
- **Floor_Selector**: The row of buttons that lets the user switch between Aetherion building floors.
- **Map_Container**: The bordered `div` that wraps the zoomable map image and its marker overlay.
- **Inverse_Scale**: A CSS transform that divides 1 by the current Zoom_Level, applied to marker icons so they maintain a constant visual size on screen.

## Requirements

### Requirement 1: Double-Click Marker Placement

**User Story:** As a player, I want to place markers by double-clicking on the map, so that single clicks and panning do not accidentally trigger marker creation.

#### Acceptance Criteria

1. WHEN the user double-clicks on the map, THE Map_Viewer SHALL record the click position as percentage-based x/y coordinates and display the Creation_Form below the map.
2. WHEN the user single-clicks on the map in an empty area, THE Map_Viewer SHALL perform no marker-related action.
3. WHILE the Creation_Form is displayed, THE Map_Viewer SHALL allow the user to set a title, description, and category for the new marker.
4. WHEN the user presses the Enter key while the title input field is focused, THE Creation_Form SHALL create the marker with the entered data.
5. WHEN a marker is successfully created, THE Map_Viewer SHALL clear the Creation_Form and return to the default state, allowing the user to immediately double-click to place another marker.
6. WHEN the user clicks the Cancel button on the Creation_Form, THE Map_Viewer SHALL discard the pending marker and return to the default state.

### Requirement 2: Zoom-Consistent Marker Sizing

**User Story:** As a player, I want map markers to stay the same visual size regardless of zoom level, so that markers do not become oversized when zoomed in or tiny when zoomed out.

#### Acceptance Criteria

1. THE Map_Viewer SHALL apply an Inverse_Scale transform to each marker icon based on the current Zoom_Level.
2. WHEN the Zoom_Level changes, THE Map_Viewer SHALL recalculate the Inverse_Scale for all visible markers so their on-screen pixel size remains constant.
3. WHILE the Zoom_Level is at any value between 0.5 and 4, THE Map_Viewer SHALL render marker icons at a consistent on-screen size (approximately 32×32 CSS pixels).

### Requirement 3: Correct Aetherion Floor Images

**User Story:** As a player, I want each Aetherion floor to display its own correct map image, so that I can see the actual layout of each floor.

#### Acceptance Criteria

1. THE Map_Viewer SHALL use separate image files for each Aetherion floor: `aetherion/GF.png` for the ground floor, and `aetherion/1.png` through `aetherion/6.png` for floors 1 to 6.
2. THE Floor_Selector SHALL display 7 floor buttons labeled "GF", "1", "2", "3", "4", "5", and "6" when the Aetherion map is active.
3. WHEN the user selects a floor, THE Map_Viewer SHALL load and display the image file corresponding to that floor number.
4. WHEN the user switches floors, THE Map_Viewer SHALL clear the selected marker and any pending creation state.

### Requirement 4: Aetherion Map Container Sizing

**User Story:** As a player, I want the Aetherion map border frame to be the same size as Valerion's, so that the map is not cut off when I scroll or zoom in.

#### Acceptance Criteria

1. THE Map_Container SHALL use consistent dimensions for both the Valerion and Aetherion maps so the border frame height matches.
2. WHILE viewing the Aetherion map at any floor, THE Map_Container SHALL not clip or cut off the map image when the user pans or zooms.
3. WHEN switching between Valerion and Aetherion, THE Map_Container SHALL maintain the same visible border frame height.
