const MarkerDef = () => (
    <svg>
        <defs>
            {/* Open Diamond for Aggregation (at source) */}
            <marker
                id="marker-aggregation"
                markerWidth="12"
                markerHeight="12"
                viewBox="-6 -6 12 12" // Center the viewbox
                refX="0" // Position at the very end of the line
                refY="0"
                orient="auto-start-reverse" // Orient correctly relative to line
            >
                <polygon points="-5,0 0,-5 5,0 0,5" stroke="#000" strokeWidth="1" fill="#fff" />
            </marker>

            {/* Filled Diamond for Composition (at source) */}
            <marker
                id="marker-composition"
                markerWidth="12"
                markerHeight="12"
                viewBox="-6 -6 12 12"
                refX="0"
                refY="0"
                orient="auto-start-reverse"
            >
                <polygon points="-5,0 0,-5 5,0 0,5" stroke="#000" strokeWidth="1" fill="#000" />
            </marker>

            {/* Triangle for Inheritance/Realization (at target) */}
            <marker
                id="marker-inheritance"
                markerWidth="12"
                markerHeight="12"
                viewBox="-6 -6 12 12"
                refX="5" // Adjust refX to position correctly (tip touches the target node)
                refY="0"
                orient="auto"
            >
                <polygon points="-5,-5 5,0 -5,5" stroke="#000" strokeWidth="1" fill="#fff" />
            </marker>
        </defs>
    </svg>
);

export default MarkerDef;