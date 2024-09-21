'use client'
import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import '/public/index.css';
import stateReportData from '../../private/Reports.state_report';
import districtReportData from '../../private/Reports.district_report';
export default function IndiaMap() {
    const svgRef = useRef(null);
    const tooltipRef = useRef(null);
    const [zoomEnabled, setZoomEnabled] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        console.log(stateReportData);
        console.log(districtReportData);

        const svg = d3.select(svgRef.current)
            .attr('width', width)
            .attr('height', height);

        const projection = d3.geoMercator()
            .center([78.9629, 23.5937])  // Center of India
            .scale(1000)  // Scale the map
            .translate([width / 2, height / 2]);

        const path = d3.geoPath().projection(projection);
        const tooltip = d3.select(tooltipRef.current);

        // Define color scales
        const stateColorScale = d3.scaleSequential(d3.interpolateBlues)
            .domain([0, 100000]); // Adjusted domain for state map

        const districtColorScale = d3.scaleSequential(d3.interpolateOranges)
            .domain([0, 20000]); // Adjusted domain for district map

        // Add zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([1, 4]) // Adjusted zoom levels
            .on("zoom", zoomed);

        if (zoomEnabled) {
            svg.call(zoom);
        } else {
            svg.on('.zoom', null); // Disable zoom
        }

        function zoomed(event) {
            svg.selectAll('path').attr('transform', event.transform);
        }

        // Prevent zoom on scroll
        d3.select(window).on("wheel", function(event) {
            if (event.target.tagName === 'svg') {
                event.preventDefault();
            }
        });

        // Function to create a legend
        function createLegend(colorScale, title, x, y) {
            const legend = d3.select("body").append("svg")
                .attr("class", "legend")
                .attr("width", 250)
                .attr("height", 50)
                .style("position", "absolute")
                .style("left", `${x}px`)
                .style("top", `${y}px`);

            const legendWidth = 300;
            const legendHeight = 20;

            const gradient = legend.append("defs")
                .append("linearGradient")
                .attr("id", "gradient")
                .attr("x1", "0%")
                .attr("y1", "0%")
                .attr("x2", "100%")
                .attr("y2", "0%");

            gradient.append("stop")
                .attr("offset", "0%")
                .attr("stop-color", colorScale(colorScale.domain()[0])); // Light color

            gradient.append("stop")
                .attr("offset", "100%")
                .attr("stop-color", colorScale(colorScale.domain()[1])); // Dark color

            legend.append("rect")
                .attr("width", legendWidth)
                .attr("height", legendHeight)
                .style("fill", "url(#gradient)");

            legend.append("text")
                .attr("x", legendWidth / 2)
                .attr("y", -6)
                .attr("text-anchor", "middle")
                .text(title);

            const xScale = d3.scaleLinear()
                .domain(colorScale.domain())
                .range([0, legendWidth]);

            const xAxis = d3.axisBottom(xScale)
                .ticks(5);

            legend.append("g")
                .attr("transform", `translate(0, ${legendHeight})`)
                .call(xAxis);
        }

        // Load GeoJSON data for Indian states
        d3.json('/india_states.geojson').then(function (geojson) {
            const states = svg.selectAll("path")
                .data(geojson.features)
                .enter().append("path")
                .attr("d", path)
                .attr("fill", d => stateColorScale(Math.random() * 100000)) // Replace Math.random() with actual data
                .attr("stroke", "black")
                .attr("stroke-width", "0.5")
                .on("mouseover", function (event, d) {
                    tooltip.style("visibility", "visible")
                        .text(d.properties.ST_NM);
                })
                .on("mousemove", function (event) {
                    tooltip.style("top", (event.pageY - 10) + "px")
                        .style("left", (event.pageX + 10) + "px");
                })
                .on("mouseout", function () {
                    tooltip.style("visibility", "hidden");
                })
                .on("click", function (event, d) {
                    showState(d);
                });

            // Create legend for states
            createLegend(stateColorScale, "State Color Scale", 20, 20);
            setLoading(false);

            function showState(stateData) {
                // Hide other states
                svg.selectAll("path").remove();
                d3.selectAll(".legend").remove(); // Remove existing legend

                // Adjust projection for the selected state
                const bounds = path.bounds(stateData);
                const dx = bounds[1][0] - bounds[0][0];
                const dy = bounds[1][1] - bounds[0][1];
                const x = (bounds[0][0] + bounds[1][0]) / 2;
                const y = (bounds[0][1] + bounds[1][1]) / 2;
                // const scale = Math.max(1, Math.min(3, 0.9 / Math.max(dx / width, dy / height)));
                const scale = Math.max(1, Math.min(3.5, 0.9 / Math.max(dx / width, dy / height)));
                // const translate = [width / (1.5) - scale * x, height / (1.5) - scale * y];
                const translate = [width / 2 - scale * x, height / 2 - scale * y];

                svg.transition()
                    .duration(1050)
                    .call(
                        zoom.transform,
                        d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
                    );

                // Draw the selected state
                svg.append("path")
                    .datum(stateData)
                    .attr("d", path)
                    .attr("fill", "orange")
                    .attr("stroke", "black")
                    .attr("stroke-width", "0.25");

                // Load district data for the selected state
                const stateName = stateData.properties.ST_NM.split(' ').join('');
                d3.json(`/districts/${stateName}.geojson`).then(function (geojson) {
                    console.log(stateName);
                    // i want to display the data of the state which is selected from the stateReportData
                    const stateData_Report = stateReportData.find(state => state.stateName === stateData.properties.ST_NM.toUpperCase());
                        // console.log(state.stateName);
                        // console.log(state.stateName.split(' ').join(''));
                        // console.log(stateName.toUpperCase());
                        // console.log(state.stateName.split(' ').join('') === stateName.toUpperCase());
                    // const {aajeevikaRegisterCount, memberCount, districtCount} = stateData_Report.stateCumulativeCounts;
                    // console.log(aajeevikaRegisterCount);
                    console.log(stateData_Report);
                    const districts = svg.selectAll("path")
                        .data(geojson.features)
                        .enter()
                        .append('path')
                        .attr("d", path)
                        .attr("fill", d => districtColorScale(Math.random() * 20000)) // Replace Math.random() with actual data
                        .attr("stroke", "black")
                        .attr("stroke-width", "0.25")
                        .on("mouseover", function (event, d) {
                            // find the district data from the stateReportData
                            console.log(d.properties.Dist_Name);
                            const districtReportDemo = districtReportData.find(district => district.districtName === d.properties.Dist_Name.toUpperCase());
                            console.log(districtReportDemo);
                            const {memberCount, aajeevikaRegisterCount,blockCount} = districtReportDemo.districtCumulativeCounts

                            // console.log(stateData_Report.districts);
                            // find the district data from the stateData_Report.districts
                            // const districtData = stateData_Report.districts.find(district => district.districtName === d.properties.Dist_Name);
                            // console.log(districtData);
                            // const districtData_Report = stateData_Report.districtCumulativeCounts;
                            // console.log(districtData_Report);
                            if(memberCount, aajeevikaRegisterCount,blockCount){
                                tooltip.style("visibility", "visible")
                                .html(`
                                    <h4>${d.properties.Dist_Name}</h4>
                                    <p><strong>State Code:</strong> ${d.properties.State_Code}</p>
                                    <p><strong>District Code:</strong> ${d.properties.Dist_Code}</p>
                                    <p><strong>AajeevikaRegisterCount:</strong> ${aajeevikaRegisterCount}</p>
                                    <p><strong>Member Count:</strong> ${memberCount}</p>
                                    <p><strong>Block Count:</strong> ${blockCount}</p>
                                `);
                            }else{
                            tooltip.style("visibility", "visible")
                                .html(`
                                    <h4>${d.properties.Dist_Name}</h4>
                                    <p><strong>State Code:</strong> ${d.properties.State_Code}</p>
                                    <p><strong>District Code:</strong> ${d.properties.Dist_Code}</p>
                                `);
                                }
                        })
                        .on("mousemove", function (event) {
                            tooltip.style("top", (event.pageY - 10) + "px")
                                .style("left", (event.pageX + 10) + "px");
                        })
                        .on("mouseout", function () {
                            tooltip.style("visibility", "hidden");
                        });
                });

                // Create legend for districts
                createLegend(districtColorScale, "District Color Scale", 20, 60);

                // Show the reset button
                d3.select("#reset").style("display", "block");
            }

            // Reset to full map view
            d3.select("#reset").on("click", function () {
                document.body.style.transition = "opacity 0.5s";
                document.body.style.opacity = 0;
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            });
        });

        // Scroll down button functionality
        document.getElementById('scroll-down').addEventListener('click', function() {
            window.scrollTo({
                top: document.body.scrollHeight,
                behavior: 'smooth'
            });
        });
    }, [zoomEnabled,loading]);

    return (
        <div>
            <h1 style={{ textAlign: 'center', margin: '20px 0' }}>Jivika Registration Report</h1>
            
            <button id="scroll-down">
                <div className="arrow-container">
                    <div className="arrow"></div>
                    <div className="arrow faded"></div>
                    <div className="arrow more-faded"></div>
                </div>
            </button>
            <button
                id="toggle-zoom"
                className="toggle-zoom-button"
                onClick={() => setZoomEnabled(!zoomEnabled)}
            >
                {zoomEnabled ? 'Disable Zoom' : 'Enable Zoom'}
            </button>
            <button id="reset" style={{ display: 'none' }} className="styled-button toggle-zoom-button">Show Full Map</button>
            {loading ? (
                <>
               <div className="loaderContainer">
                <div className="loader">
                    <div className="circle"></div>
                    <div className="circle"></div>
                    <div className="circle"></div>
                </div>
                </div>
                </>
            ) : (
                <>
                    <div id="chart" style={{ margin: 0 }}></div>
                    <svg ref={svgRef}></svg>
                    <div ref={tooltipRef} className="tooltip"></div>
                </>
            )}
            <div className="container">
                <section className="citizen-corner">
                    <h2 className="section-title">Citizen Corner:</h2>
                    <div className="search-container">
                        <div className="search-box">
                            <input
                                type="text"
                                placeholder="Know status of JJM implementation in your village: Select State -> District-> Village"
                            />
                            <button className="search-button">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="feather feather-search"
                                >
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                </section>

                <section className="water-supply-status">
                    <div className="stats-container">
                        <div className="stat-box">
                            <h3>Total number of Village members</h3>
                            <p className="stat-value">19,33,33,622</p>
                        </div>
                        <div className="stats-container"></div>
                        <div className="stat-box" style={{ color: 'green' }}>
                            <h3>Total number of Jivika register</h3>
                            <p className="stat-value" style={{ color: 'green' }}>14,33,33,622</p>
                        </div>
                        <div className="stat-box blue">
                            <h3>Approved Members</h3>
                            <p className="stat-value">10,09,70,784</p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
