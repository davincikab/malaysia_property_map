[
    "case",
    ["!=", ["to-string",["get", "Median PSF"]], "NaN"],
    [
        "interpolate",
        ["linear"],
        ["get", "Median PSF"],                    
        400,
        "#D7191C",
        800,
        "#FDAE61",
        1200,
        "#FFFFBF",
        1600,
        "#ABD9E9",
        2200,
        "#2C7BB6"
    ],
    "#949090"
]