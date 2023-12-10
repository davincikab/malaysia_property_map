mapboxgl.accessToken = 'pk.eyJ1Ijoid2tpdDg4IiwiYSI6ImNsbTZnMmlzczQxbXYzZWxpY2VteGZ3eWsifQ.QXvOAjBOQs35khSdtCvgKQ';
const map = new mapboxgl.Map({
    container: 'map',
    // Choose from Mapbox's core styles, or make your own style with Mapbox Studio
    // style: 'mapbox://styles/mapbox/dark-v11',
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [101.70149857491737, 3.178736356636577],
    // zoom:10.3,
    zoom: 12.15,
    doubleClickZoom:false,
    boxZoom:false,
    scrollZoom:false
});

// longitude=101.70149857491737&latitude=3.178736356636577

let popupCategories = {
    "General":{
        dataColumns:'Median PSF',
        columns:['Tenure', 'Type', 'Title', 'Average Asking PSF','Max Asking Price','Median Price', 'Median PSF'],
        // columns:['Median Price','Median PSF','Average Asking PSF', 'Min Asking Price','Max Asking Price']
    }, 
    "Studio":{
        dataColumns:'Studio Sell PSF',
        columns:['Studio Sell Price', 'Studio Sell PSF', 'Studio Rent Price', 'Studio Rent PSF']
    }, 
    "1 Bedroom":{
        dataColumns:'1 Bed Sell PSF',
        columns:['1 Bed Sell Price', '1 Bed Sell PSF', '1 Bed Rent Price', '1 Bed Rent PSF']
    }, 
    "2 Bedrooms":{
        dataColumns: '2 Beds Sell PSF',
        columns:['2 Beds Sell Price', '2 Beds Sell PSF', '2 Beds Rent Price', '2 Beds Rent PSF']
    }, 
    "3 Bedrooms":{
        dataColumns:'3 Beds Sell PSF',
        columns:['3 Beds Sell Price', '3 Beds Sell PSF', '3 Beds Rent Price', '3 Beds Rent PSF', '4 Beds Sell Price']
    }, 
    "4 Bedrooms":{
        dataColumns:'4 Beds Sell PSF',
        columns:['4 Beds Sell Price', '4 Beds Sell PSF', '4 Beds Rent Price', '4 Beds Rent PSF']
    }, 
    "Room Rental":{
        dataColumns:'Single Room Rental',
        columns:['Single Room Rental', 'Middle Room Rental', 'Master Room Rental']
    }
};

const FILTER_OBJECT = {
    'Category':{elem:"category", label:"New Project/Subsale", values:[ "New Project", "Subsale"] },
    'Bedrooms':{elem:"bedrooms", label:"Bedrooms", values:["General", "Studio", "1 Bedroom", "2 Bedrooms", "3 Bedrooms", "4 Bedrooms"]},
    'Tenure':{elem:"tenure", label:"Tenure", values:["Freehold","Leasehold"]},
    'Title Type':{elem:"title", label:"Title Type", values:["Residential", "Commercial"]},
    'Property Type':{elem:"property", label:"Property Type", values:["Condominium","Service Residence","Apartment","Flat"]},
    'Train':{elem:"train", label:"Bedrooms", values:[
        {'Train Station':[
        "LRT Kelana Jaya Line","LRT Sri Petaling-Ampang Line",
        "Monorail Line","MRT1 Kajang Line","MRT2 Putrajaya Line",
        "MRT3 Circle Line (Future)", "LRT3 Shah Alam Line"]
        },
        {'Interchange':['Existing Interchange', 'Future Interchange']}
    ]},
};

const LAYERS_OBJECT = {
    "Amenities":{elem:"amenities", label:"Amenities", values:[ 
        "Tier 1 Shopping Malls","Shopping Malls", "Medical Center", "Primary Chinese School","International School", 
        "Golf Club", "Existing Job Creation", "Future Job Creation"
    ] },
    "Rental Demand Heatmap":{elem:"rental", label:"", values:["Room Rental Data", "Room Rental Heatmap","Airbnb Short Term Rental"]},
    "Commercial Urban Heatmap":{elem:"commercial", label:"", values:["BMS Heatmap",'Local Bank', 'Foreign Bank', 'McDonald', 'Starbucks']}
}


class RealEstateProject {
    constructor(map, filterTabs, layerTabs, trainLines) {
        this.spinnerContainer = document.querySelector(".spinner-container");

        this.map = map;
        this.listings = [];
        this.filterTabs = filterTabs;
        this.layerTabs = layerTabs;
        this.trainLines = trainLines;
        this.dataUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRkQpggnME5PXwyU_4QhRFmT3PMDQA2NGpWs9XUZFe2rh3KvlyO_mrCvPYA159ZaKsF0LvUfHloWovp/pub?output=xlsx"

        this.popup = new mapboxgl.Popup();
        this.popupFields = ['Tenure', 'Type', 'Title', 'Average Asking PSF','Max Asking Price'];
        this.activePopups = "General";
        this.listingGeo = {'type': 'FeatureCollection','features': [] };
        this.circleFc = {"type":"FeatureCollection", "features":[] }

        this.trainIcons =  {
            "KG":"MRT1 Kajang Line.png",
            "PY":"MRT2 Putrajaya Line.png",
            "KJ":"LRT Kelana Jaya Line.png",
            "MR":"Monorail Line.png",
            "CC":"MRT3 Circle Line.png",
            "SP":"LRT Sri Petaling Ampang Line.png",
            "AG":"ampang.png",
            "AG SP":"ampang_sp.png",
            "SA":"LRT3.png"
        };

        this.filterObject = {'price':[0, Infinity]};
        this.amenityValues = [];
        this.rental = [];
        this.heatmaps = [];
        this.commercial = [];

        this.init();
        this.renderFilterTabs();
        this.renderLayerTabs();
        this.filterChangeListeners();
    }

    init() {
        this.map.on("load", (e) => {
            console.log("Map Loaded");
            this.renderData();      
        });
    }

    renderData() {
        if(map.getLayer('transit-label')) {
            map.removeLayer('transit-label')
        } 

        let keys = Object.keys(this.trainIcons);
        Object.values(this.trainIcons).forEach((icon,i) => {
            let url = `/train_icons/${icon}`;
            let code = `${keys[i]}-train`;

            map.loadImage(url, (err, image) => {
                if(err) throw err;

                if(!map.hasImage(code)) {
                    map.addImage(`${code}`, image);
                }
                
            });

        });

        ['square-icon', 'circle-icon', 'circles-15', 'squares-15'].forEach(item => {
            let url =`/icons/${item}.png`;

            map.loadImage(url, (err, image) => {
                if(err) throw err;

                
                if(!map.hasImage(item)) {
                    map.addImage(`${item}`, image, {sdf:true});
                }
            });
        })

        let icons = [
            'golf-club', 'mall', 'starbucks', 'mcdonald', 'local-bank', 'foreign-bank','shopping-mall', 
            'schools', 'inter-school', 'medical-center', 'railway', "interchange", "other-jobs", "kl-jobs"
        ];

        icons.forEach(item => {
            map.loadImage(`/icons/${item}.png`, (err, image) => {
                if(err) throw err;

                
                if(!map.hasImage(item)) {
                    map.addImage(`${item}`, image);
                }

            });
        });

        
        map.addSource('interchange', {
            'type': 'geojson',
            'data': {'type': 'FeatureCollection','features': [] }
        });

        map.addLayer({
            id:'interchange',
            source:'interchange',
            type:'symbol',
            filter:['in', 'Type', ""],
            paint:{
                'icon-color':'red'
            },
            layout:{
                'icon-size':0.05,
                'icon-offset':[5,5],
                'icon-allow-overlap':true,
                'icon-image':'interchange'
            }
        });
        

        map.addSource('train-stations', {
            'type': 'geojson',
            'data': {'type': 'FeatureCollection','features': [] }
        });

        map.addLayer({
            id:'train-stations',
            source:'train-stations',
            type:'symbol',
            paint:{
                'icon-color':'red'
            },
            layout:{
                'icon-size':0.5,
                'icon-offset':[5,5],
                'icon-allow-overlap':true,
                'icon-image':['get', 'icon']
                // 'railway'
            }
        });
        

        // amenities
        
        map.addSource('amenities', {
            'type': 'geojson',
            'data': {'type': 'FeatureCollection','features': [] }
        });

        map.addLayer({
            id:'amenities',
            source:'amenities',
            type:'symbol',
            filter:['in', 'layer', ""],
            layout:{
                'icon-size':[
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    0,
                    0.01,
                    15,
                    0.06
                ],
                'icon-image':['get', 'icon'],
                'icon-allow-overlap':true
            }
        });

        // commercial ammenities
        map.addSource('commercial-amenities', {
            'type': 'geojson',
            'data': {'type': 'FeatureCollection','features': [] }
        });

        map.addLayer({
            id:'commercial-amenities',
            source:'commercial-amenities',
            type:'symbol',
            filter:['in', 'layer', ""],
            layout:{
                'icon-size':[
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    0,
                    0.01,
                    15,
                    0.06
                ],
                'icon-image':['get', 'icon'],
                'icon-allow-overlap':true
            }
        });

        // commercial Heat Maps
        map.addSource('commercial-heatmap', {
            'type': 'geojson',
            'data': {'type': 'FeatureCollection','features': [] }
        });

        map.addLayer({
            id:'commercial-heatmap',
            source:'commercial-heatmap',
            type: "heatmap",
            layout:{'visibility':'none'},
            paint: {
                "heatmap-radius": 15
            }
        })

        // rental demand heatmap
        map.addSource('bnb-heatmap', {
            'type': 'geojson',
            'data': {'type': 'FeatureCollection','features': [] }
        });

        map.addLayer({
            id:'bnb-heatmap',
            source:'bnb-heatmap',
            type: "heatmap",
            paint: {
                "heatmap-radius": 5
            },
            layout:{ 'visibility':'none'}
        });

        // Listings
        map.addSource('location-data', {
            'type': 'geojson',
            'data': {'type': 'FeatureCollection','features': [] }
        });

        map.addLayer({
            'id': 'location-data',
            'type': 'symbol',
            'source': 'location-data',
            'filter':['==', 'project', 'New Project'],
            'paint':{
                'icon-color':[
                    'case',
                    ['!=', ['to-string',['get', 'Average Asking PSF']], ''],
                    [
                        'interpolate',
                        ['linear'],
                        ['get', 'Average Asking PSF'],                    
                        0,
                        '#8ac744',
                        400,
                        '#c8dc3f',
                        600,
                        '#fada30',
                        800,
                        '#f78f2c',
                        1000,
                        '#ee641b',
                        1500,
                        '#d9360f',
                        2000,
                        '#000'
                    ],
                    '#949090'
                ],
                'icon-halo-color':'#000',
                'icon-halo-width':2.5
            },
            'layout':{
                'icon-size':['interpolate', ['linear'], ['zoom'], 10, 0.1, 15, 0.35],
                // 'icon-size':['interpolate', ['linear'], ['zoom'], 10, 1.5, 15, 2.35],
                // 'icon-image':['match', ['get', 'project'], 'Subsale', 'circles-15', ],
                'icon-image':'squares-15',
                'icon-allow-overlap':true
            }
           
        });

        map.addLayer({
            'id': 'location-data-circle',
            'type': 'circle',
            'source': 'location-data',
            'filter':['==', 'project', 'Subsale'],
            'paint': {
                'circle-color': [
                    'case',
                    ['!=', ['to-string',['get', 'Average Asking PSF']], ''],
                    [
                        'interpolate',
                        ['linear'],
                        ['get', 'Average Asking PSF'],                    
                        0,
                        '#8ac744',
                        400,
                        '#c8dc3f',
                        600,
                        '#fada30',
                        800,
                        '#f78f2c',
                        1000,
                        '#ee641b',
                        1500,
                        '#d9360f',
                        2000,
                        '#000'
                    ],
                    '#949090'
                ],
                'circle-radius': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],  
                    10, 
                    2.5,
                    14, 
                    4.5
                ],
                'circle-stroke-width': 0.5,
                'circle-stroke-color': '#000'
            }
        });

        // rental data
        map.addSource('rental-data', {
            'type': 'geojson',
            'data': {'type': 'FeatureCollection','features': [] }
        });

        map.addLayer({
            'id': 'location-data-rental',
            'type': 'circle',
            'source': 'rental-data',
            'filter':['!=', 'Single Room Rental', ""],
            'layout':{'visibility':'none'},
            'paint': {
                'circle-color': [
                    'case',
                    ['!=', ['to-string',['get', 'Single Room Rental']], ''],
                    [
                        'interpolate',
                        ['linear'],
                        ['get', 'Single Room Rental'],                    
                        0,
                        '#8ac744',
                        400,
                        '#c8dc3f',
                        600,
                        '#fada30',
                        800,
                        '#f78f2c',
                        1000,
                        '#ee641b',
                        1500,
                        '#d9360f',
                        2000,
                        '#000'
                    ],
                    '#949090'
                ],
                'circle-radius': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],  
                    10, 
                    3.6,
                    14, 
                    5.8
                ],
                'circle-stroke-width': 0.5,
                'circle-stroke-color': '#000'
            }
        });

        // rental heatmap
        map.addSource('rental-heatmap', {
            'type': 'geojson',
            'data': {'type': 'FeatureCollection','features': [] }
        });

        map.addLayer({
            id:'rental-heatmap',
            source:'rental-heatmap',
            type: "heatmap",
            paint: {
                "heatmap-radius": 5,
                "heatmap-weight":[
                    "interpolate",
                    ['linear'],
                    ['get', 'Total Room Listings'],
                    0,
                    1,
                    50000,
                    15
                ]
            },
            layout:{ 'visibility':'none'}
        });

        map.addSource("train-lines", {
            type:'geojson',
            data:'/data/train_lines.geojson'
        });

        map.addLayer({
            id:'train-lines',
            source:'train-lines',
            type:'line',
            paint:{
                'line-width':2,
                'line-color':['get', 'stroke']
            }
        });

        map.addSource("user-circle", {
            type:"geojson",
            data:{"type":"FeatureCollection", "features":[]}
        });

        map.addLayer({
            id:"user-circle",
            source:"user-circle",
            type:"fill",
            paint:{
                "fill-opacity":0.2,
                "fill-color":"orange",
                "fill-outline-color":"white"
            }
        }, "continent-label");

        ['location-data', 'location-data-circle', 'location-data-rental'].map(layerId=> {
            map.on('mouseenter', layerId, (e) => {
                // Change the cursor style as a UI indicator.
                map.getCanvas().style.cursor = 'pointer';
            });
        });
       
        ['amenities', 'commercial-amenities'].map(layerId => {
            console.log(layerId);

            map.on('mouseenter', layerId, (e) => {
                if(e.features[0]) {
                    let feature = e.features[0];

                    let popupContent = ""
                    if(feature.properties.layer.includes('Job Creation')) {
                        popupContent = `<div "popup-content">
                            <div class="popup-title">${feature.properties['Future Job']}</div>
                            <div class="popup-body">
                                <img src="${feature.properties['Image']}" alt="" width="100%" height="180px" /> 
                                <div class="popup-item">
                                    <div>Driven By</b> <b>${feature.properties['Driven By']}</b
                                </div>
                                <div class="popup-item">
                                    <div>Connected Train Lines</b>  <b>${feature.properties['Connected Train Lines ']}</b
                                </div>
                            </div>
                        </div>`;
                    } else {
                        popupContent = `<div "popup-content">${feature.properties.Name}</div>`;
                    }
                    
                    this.popup.setHTML(popupContent).setLngLat(feature.geometry.coordinates).addTo(this.map);
                }
            });

            map.on('mouseleave', layerId, (e) => {
                this.popup.remove();
            });
        });
        

       ['location-data', 'interchange', 'location-data-circle', 'location-data-rental'].map(layerId => {

            map.on('click', layerId, (e) => {
                if(e.features[0]) {
                    let feature = e.features[0];
                    console.log(feature);
                    let popupContent = "";
                    if(layerId == 'interchange') {
                        popupContent = ""
                    } else {
                        popupContent = this.createPopupContent(feature.properties, layerId);
                    }
                    
                    this.popup.setHTML(popupContent).setLngLat(e.lngLat).addTo(this.map);
                }
            });
       });

       map.on('click', 'train-stations', (e) => {
            if(e.features[0]) {
                let feature = e.features[0];
                let popupContent = `<div "popup-content">${feature.properties['Train Station Name']}</div>`;
                this.popup.setHTML(popupContent).setLngLat(e.lngLat).addTo(this.map);
            }
        });
       

        if(this.listings.length) {
            this.renderLayers();
        }

    }

    loadData() {
        fetch(this.dataUrl)
            .then(res => res.arrayBuffer())
            .then(async(arrBuf) => {
                // var dataInt = new Uint8Array(arrBuf);
                var workbook = XLSX.read(arrBuf, {type:"binary", cellDates: true, dateNF:"dd/mm/yy"});
                this.sheets = this.processWorkbook(workbook);

                this.lrt3Sheet = await this.loadLrt3Data();

                this.listings = [
                    ...this.sheets['Subsale'].map(item => ({...item, project:'Subsale'}) ),
                    ...this.sheets['New Project'].map(item => ({...item, project:'New Project'}) )
                ];

                this.amenities = {
                    "Tier 1 Shopping Malls":this.sheets['Tier 1 Mall'],
                    "Shopping Malls":this.sheets['Other Malls'],
                    "Primary Chinese School":this.sheets['Primary Chinese School'],
                    "International School":this.sheets['International School'],
                    "Golf Club":this.sheets['Golf Club']
                };

                this.amenitiesItems = [
                    ...this.sheets['Tier 1 Mall'].map(item => ({...item, layer:'Tier 1 Shopping Malls', icon:'mall'})),
                    ...this.sheets['Other Malls'].map(item => ({...item, layer:'Shopping Malls', icon:'shopping-mall'})),
                    ...this.sheets['Medical Center'].map(item => ({...item, layer:'Medical Center', icon:'medical-center'})),

                    ...this.sheets['Primary Chinese School'].map(item => ({...item, layer:'Primary Chinese School', icon:'schools'})),
                    ...this.sheets['International School'].map(item => ({...item, layer:'International School', icon:'inter-school'})),
                    ...this.sheets['Golf Club'].map(item => ({...item, layer:'Golf Club', icon:'golf-club'})),
                    ...this.lrt3Sheet['Job Creation']
                ];

                this.rentalHeatmap = {
                    "Room Rental":[...this.listings],
                    "Airbnb Short Term Rental":this.sheets['Airbnb Heat Map']
                }

                let bms = [
                    ...this.sheets['McDonald'].map(item => ({...item, layer:'BMS Heatmap', icon:'mall'})),
                    ...this.sheets['Starbucks'].map(item => ({...item, layer:'BMS Heatmap', icon:'shopping-mall'})),
                    ...this.sheets['Local Bank'].map(item => ({...item, layer:'BMS Heatmap', icon:'schools'})),
                    ...this.sheets['Foreign Bank'].map(item => ({...item, layer:'BMS Heatmap', icon:'inter-school'}))
                ]

                this.commercialHeatMap = {
                    bms:[...bms],
                    amenities:[
                        ...this.sheets['Local Bank'].map(item => ({...item, layer:'Local Bank', icon:'local-bank'})),
                        ...this.sheets['Foreign Bank'].map(item => ({...item, layer:'Foreign Bank', icon:'foreign-bank'})),
                        ...this.sheets['McDonald'].map(item => ({...item, layer:'McDonald', icon:'mcdonald'})),
                        ...this.sheets['Starbucks'].map(item => ({...item, layer:'Starbucks', icon:'starbucks'}))
                    ]
                }


                console.log(this.sheets);

                this.filterListing = JSON.parse(JSON.stringify(this.listings));
                this.listingGeo = this.pointsToGeojson(this.listings);

                this.renderLayers();   
                this.loadStationsData()  

                this.handleSearchParams();

                // this.handleFilterListing();
                // this.filterListing();
            })
            .catch(console.error)

    }

    async loadLrt3Data() {
        let url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSnOriojllLenaesOdLROr4-ImfLdWHa1MRtWk3Bz_sh9fgPeW98jmxLxx0oghunN5p85glUOcuj-zk/pub?output=xlsx";

        try {
            let res = await fetch(url)
            let arrBuf = await res.arrayBuffer();
            var workbook = XLSX.read(arrBuf, {type:"binary", cellDates: true, dateNF:"dd/mm/yy"});
            let processedData = this.processWorkbook(workbook);
    
            return processedData; 
        } catch (error) {
            throw error;
        }
         
    }

    renderLayers() {
        if(this.map.getSource('location-data')) {
            this.renderListing(this.listingGeo);
            this.renderAmmenites(this.amenitiesItems);
            this.renderCommercialAmenities(this.commercialHeatMap.amenities)

            this.renderCommercialHeatmap(this.commercialHeatMap.bms);

            this.renderRentalHeatmap(this.rentalHeatmap);
            this.renderInterchange(this.lrt3Sheet['Interchange']);

            console.log("Rendering");
            this.spinnerContainer.classList.add("d-none");
        }
    }

    processWorkbook(workbook) {
        let sheetsNames = [...workbook.SheetNames];
        let sheets = {};
    
        sheetsNames.forEach(sheetName => {
            sheets[sheetName] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { cellDates:true, dateNF:"dd/mm/yy" });
        });
    
        return sheets;
    }


    renderListing(data) {
        this.map.getSource("location-data").setData(data);
    }

    renderAmmenites(entries) {
        let data = this.pointsToGeojson(entries);
        this.map.getSource("amenities").setData(data);
    }

    renderCommercialAmenities(entries) {
        let data = this.pointsToGeojson(entries);
        this.map.getSource("commercial-amenities").setData(data);
    }

    renderCommercialHeatmap(entries) {
        let data = this.pointsToGeojson(entries);
        console.log(data);
        this.map.getSource("commercial-heatmap").setData(data);
    }

    renderInterchange(entries) {
        let data = this.pointsToGeojson(entries);
        console.log(data);
        this.map.getSource("interchange").setData(data);
    }
    
    renderRentalHeatmap(data) {
        let [rental, airbnb] = Object.values(data);
        console.log(rental);
        console.log(airbnb);
        
        this.map.getSource("rental-heatmap").setData(this.pointsToGeojson(rental));
        this.map.getSource("bnb-heatmap").setData(this.pointsToGeojson(airbnb));

        let rentalListing = rental.filter(item => item['Single Room Rental'])
        this.map.getSource("rental-data").setData(this.pointsToGeojson(rentalListing));
    }

    renderFilterTabs() {

        this.filters = Object.values(this.filterTabs).map(tabs => {

            if(tabs.elem != 'train') {
                return VirtualSelect.init({
                    ele: `#${tabs.elem}-select`,
                    multiple:tabs.elem == 'bedrooms' ? false : true,
                    name:`${tabs.elem}`,
                    selectAllText:"Select All",
                    searchPlaceholderText:"Select All",
                    selectedValue:[...tabs.values.map(item=> item)],
                    options: [...tabs.values.map(item => ({ label: item, value: item })) ],
                });
            } else {
                let optionGroups = tabs.values.map(item => {
                    let key = Object.keys(item)[0];
                    let options = item[key].map(val => ({ label: val, value: val }));
                    console.log(options);

                    return {'label':key, options:[...options], multiple:true}
                });

                console.log(optionGroups);
                return VirtualSelect.init({
                    ele: `#${tabs.elem}-select`,
                    multiple:true,
                    name:`${tabs.elem}`,
                    selectAllText:"Select All",
                    searchPlaceholderText:"Select All",
                    selectedValue:[...tabs.values[0]['Train Station'].map(item=> item)],
                    options: optionGroups
                    // [...tabs.values.map(item => ({ label: item, value: item })) ],
                });
            }
            

        })
        
          
    }

    filterChangeListeners() {
        document.querySelectorAll(".styles").forEach(toggler => {

            toggler.onclick = (e) => {
                let { id } = e.target;
                this.handleStyleChange(id);
            }
        })

        Object.values(this.filterTabs).map(tabs => {
            document.querySelector(`#${tabs.elem}-select`).addEventListener('change', (e) => {
                let { name, value} = e.target;
                this.filterObject[name] = value;
                
                if(this.listings) {
                    this.handleFilterListing()
                }
               
            });
        });

        
        document.getElementById("min-price").onchange = (e) => {
            let { price } = this.filterObject;
            let { value } = e.target;
            value = value ? value : 0;
            console.log(value);

            this.filterObject.price = [value, price[1]];
            this.handleFilterListing()
            // this.renderListing()
        };

        document.getElementById("max-price").onchange = (e) => {
            let { price } = this.filterObject;
            let { value } = e.target;
            value = value ? value : Infinity;
            console.log(value);

            this.filterObject.price = [price[0], value];
            this.handleFilterListing()
            // this.renderListing()
        }


        // layers tabs
        document.querySelector(`#amenities-select`).addEventListener('change', (e) => {
            let {value}  = e.target;
            this.amenityValues = value;
           
            this.toggleAmmenities();
        });

        document.querySelector(`#commercial-select`).addEventListener('change', (e) => {
            let {value}  = e.target;
            this.commercial = value;

            this.toggleCommercial();
           
        });

        // rental heatmaps
        document.querySelector(`#rental-select`).addEventListener('change', (e) => {
            let {value}  = e.target;
            console.log(value);
            this.heatmaps = value;

           this.toggleHeatmaps();            
        });
        
    }

    handleStyleChange(styleId) {
        this.map.setStyle(`mapbox://styles/mapbox/${styleId}`, {diff:false });

        this.map.once('styledata', () => { 
            this.renderData();
                        
            this.toggleAmmenities();
            this.toggleHeatmaps();

            console.log(this.stations);
            if(this.stations) {
                let stationsGeo = this.pointsToGeojson(this.stations);
                this.map.getSource('train-stations').setData(stationsGeo);
            }
           

            let values = this.filterObject.train;
            map.setFilter("train-lines", ['in', 'Train Line', ...values]);
            map.setFilter("train-stations", ['in', 'Train Line', ...values]);
            this.map.getSource("user-circle").setData(this.circleFc)

            console.log("Style Change");
            const i2 = setInterval(() => {
                if(this.map.loaded()) {
                    this.handleFilterListing();
                    this.toggleCommercial();
                    clearInterval(i2);
                }
            }, 50);
            
        });


    }

    toggleAmmenities() {
        console.log(this.amenityValues);
        map.setFilter("amenities", ['in', 'layer', ...this.amenityValues])
    }

    toggleCommercial() {
        if(this.commercial.includes("BMS Heatmap")) {
            map.setLayoutProperty('commercial-heatmap', 'visibility', 'visible');
        } else {
            map.setLayoutProperty('commercial-heatmap', 'visibility', 'none');
        }

        map.setFilter("commercial-amenities", ['in', 'layer', ...this.commercial]);
       
    }

    toggleHeatmaps() {
        let layers = {'Room Rental Heatmap':'rental-heatmap', 'Airbnb Short Term Rental':'bnb-heatmap'};
        
        if(this.heatmaps.includes('Room Rental Data')) {
            // this.popupFields = popupCategories["Room Rental"].columns;
            map.setLayoutProperty('location-data-rental', 'visibility', 'visible');
            map.setLayoutProperty('location-data', 'visibility', 'none');
            map.setLayoutProperty('location-data-circle', 'visibility', 'none');
        } else {
            // this.popupFields = popupCategories[this.activePopups].columns;
            map.setLayoutProperty('location-data-rental', 'visibility', 'none');
            map.setLayoutProperty('location-data', 'visibility', 'visible');
            map.setLayoutProperty('location-data-circle', 'visibility', 'visible');
        }

        Object.keys(layers).map(key => {
            let layerId = layers[key];

            if(this.heatmaps.includes(key)) {
                this.map.setLayoutProperty(layerId, 'visibility', 'visible')
            } else {
                this.map.setLayoutProperty(layerId, 'visibility', 'none')
            }
        })
    }

    handleFilterListing() {
        if(!map.loaded()) {
            console.log("Map Not Loaded");
            return;
        }

        this.spinnerContainer.classList.remove("d-none");
        console.log("Show Spinner");

        let filteredListing = [...this.listings];

        setTimeout(() => {
            Object.keys(this.filterObject).map(key => {
                let values = this.filterObject[key];
                filteredListing = this.filterListingBy(key, values, filteredListing);
            });
    
            this.listingGeo = this.pointsToGeojson(filteredListing);
        
            console.log(this.listingGeo);
            this.renderListing(this.listingGeo);
            this.spinnerContainer.classList.add("d-none");
        }, 200);
       
    }

    filterListingBy(name, values, listings) {
        switch(name) {
            case 'category':
                return listings.filter(item => values.includes(item.project));
            case 'tenure':
                if(values.length == 2) { return listings }
                return listings.filter(item => values.includes(item['Tenure']));
            case 'title':
                if(values.length == 2) { return listings }
                return listings.filter(item => values.includes(item['Title']));
            case 'property':
                if(values.length == 4) { return listings }
                return listings.filter(item => values.includes(item['Type']));
            case 'bedrooms':
                if(!values) {
                    return listings;
                }

                this.activePopups = values;
                let targetColumn = popupCategories[values].dataColumns
                this.popupFields = popupCategories[values].columns;

                // ['!=', ['to-string',['get', 'Average Asking PSF']], ''],
                // console.log()
                // map.setFilter("location-data", [ '==', `${targetColumn}`, ""]);

                return targetColumn == 'General' ? listings : listings.filter(item => item[targetColumn]);
            case 'train':
                
                if(values.join("").includes("Interchange")) {
                    console.log(values);
                    map.setFilter("train-lines", ['==', 'Train Line',""]);
                    map.setFilter("train-stations", ['==', 'Train Line', ""]);

                    map.setFilter("interchange", ['in', 'Type', ...values]);

                    return this.filterListingByInterchangeBuffer(listings);
                } else {
                    map.setFilter("train-lines", ['in', 'Train Line', ...values]);
                    map.setFilter("train-stations", ['in', 'Train Line', ...values]);

                    map.setFilter("interchange", ['==', 'Type', ""]);

                    return this.filterListingByTrainBuffer(listings);
                }
                
            case 'price':
                let [min, max] = values;
                if(min == 0 && max == Infinity) { return listings }
                return listings.filter(item => (item['Min Asking Price'] > min && item['Max Asking Price'] < max) )
            default:
                return listings;
        }
    }

    filterListingBedrooms(listings, values) {
        console.log(values);
        let filters = [];

        if(values.length == 5) {
            return [...listings]
        } else if(!values.length) {
            return[];
        } else {
            let beds = values.map(val => {
                let beds = val.split(" ")[0];
                let text = "";

                if(beds != 'Studio') {
                    text = `${beds} Bed`;
                } else {
                    text = beds;
                }

                return text;
            });

            if(values.includes('4 Bedrooms and above')) {
                beds = [...beds, '5 Bed','6 Bed'];
            }

            let items = [];
            console.log(beds);

            beds.forEach(bedItem => {
                let itemsFilter = listings.filter(item => {
                    let keys = Object.keys(item).filter(key => key.includes(bedItem));

                    return keys.find(key => item[key]) ? item : false;
                });

                items = [...items, ...itemsFilter];

            });

            
            let targetItems = items.reduce((a,b) => {
                let isAdded = a.find(entry => entry['Condo Name'] == b['Condo Name']);
                if(!isAdded) {
                    a.push(b);
                }
                return a;
            }, [])

            console.log(targetItems);
            return targetItems;
        }
        

    }

    renderLayerTabs() {
        this.layers = Object.values(this.layerTabs).map(tabs => {
            return VirtualSelect.init({
                ele: `#${tabs.elem}-select`,
                multiple:true,
                selectAllText:"Select All",
                selectedValue:"",
                options: [...tabs.values.map(item => ({ label: item, value: item })) ],
            });

        })
    }

    createPopupContent(props, layerId) {
        let columns = layerId == 'location-data-rental' ? popupCategories['Room Rental'].columns : this.popupFields;

        let items = columns.map(entry => {
            let value = props[entry]

            if(value) {
                value = (entry.includes('Rental') || entry.includes('PSF') || entry.includes('Price')) ? `RM ${Math.round(value).toLocaleString("en-US")}` : value;
            }

            return `<p style="color:#333;" >${entry} : <span style="color:#000;">${value || ""}&nbsp;</span></p>`;
        });

        return `<div class="popup-content">
            <div class="popup-header">${props['Condo Name']}</div>

            <div class="popup-body">
                ${items.join("")}
                <p>Area : <span style="color:#1abc9c;">${props['Area']}&nbsp;</span></p>
            </div>
        </div>`;
    }

    pointsToGeojson(items) {
        let features = items.map(item => {
            return {
                "type":"Feature",
                "geometry":{"type":"Point", "coordinates":[item.Longitude, item.Latitude]},
                "properties":{...item}
            }
        });

        return { "type":"FeatureCollection", "features":[...features] };
    }

    filterListingByInterchangeBuffer(listings) {
        let interchangeGeo = this.pointsToGeojson(this.lrt3Sheet['Interchange']);
        let buffer = turf.buffer(interchangeGeo, 1);
        let points = this.pointsToGeojson(listings);

        let listingsWithinBuffer = turf.pointsWithinPolygon(points, buffer);
        console.log(listingsWithinBuffer);

        return listingsWithinBuffer.features.map(ft => ft.properties);
    }

    filterListingByTrainBuffer(listings) {
        if(!this.filterObject.train.length) {
            return [];
        } else if(this.filterObject.train.length !== 7) {
            let lines = this.filterObject.train;
            let trainLines = this.trainLines.features.filter(line => lines.includes(line.properties["Train Line"]));

            let buffer = turf.buffer(turf.featureCollection(trainLines), 1);

            let points = this.pointsToGeojson(listings);
            let listingsWithinBuffer = turf.pointsWithinPolygon(points, buffer);

            return listingsWithinBuffer.features.map(ft => ft.properties);
        } else {
            return listings;
        }
        
    }

    loadStationsData() {
        // Read vessel locations
        let sheetId = '14DmnrP_dj0_XuqH94-S6Fl5btYXXacUXom53j1ErsjA';
        let baseUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?`;
        let sheetName = 'Sheet1';
        let query = encodeURIComponent('Select *')
        let dataUrl = `${baseUrl}&sheet=${sheetName}&tq=${query}`;
        let markers = [], data;

        fetch(dataUrl)
        .then(res => res.text())
        .then(resData => {
            let info = this.processStationsData(resData);
            data = JSON.parse(JSON.stringify(info));

            this.stations = [...data, ...this.lrt3Sheet['LRT3']];

            this.stations = this.stations.map(item => {
                let line = item['Train Line'];
                line = line == 'MRT3 Circle Line' ? 'MRT3 Circle Line (Future)' : line == 'LRT Sri Petaling Ampang Line' ? 'LRT Sri Petaling-Ampang Line' : line;
                return {...item, 'Train Line': line, icon:`${item['Train Line Code']}-train`};
            });

            

            console.log("Station Response");

            let stationsGeo = this.pointsToGeojson(this.stations);

            setTimeout(() => {
                this.map.getSource('train-stations').setData(stationsGeo);
            }, 2000);
           
            
            console.log(stationsGeo.features);
            // renderVessels(info);
            // renderCategories(info);
        }) 
        .catch(error => {
            console.log(error);
        });
    }

    processStationsData(responseData) {
        //Remove additional text and extract only JSON:
        const jsonData = JSON.parse(responseData.substring(47).slice(0, -2));
        let cols = jsonData.table.cols.map(entry => entry.label ).filter(col => col);
        let data = [];

        jsonData.table.rows.map(entry => {
            let entries = entry.c.map(item => {
                if(item) {
                    return item.f ? item.f : item.v;
                }

                return item; 
            });

            let obj = entries.reduce((a, b, i) => {
                a = {...a, [cols[i]]:b};

                return a;
            }, {})

            data.push(obj);
        });

        return data;
    }

    createCircle(lat, lng) {
        this.userMarker = new mapboxgl.Marker().setLngLat([lng, lat]).addTo(this.map); 
        let circleFeature = turf.circle(turf.point([lng, lat]), 3);
        let bbox = turf.bbox(circleFeature);

        this.circleFc = {"type":"FeatureCollection", "features":[circleFeature] }
        this.map.fitBounds(bbox, { padding:30 });
        this.map.getSource("user-circle").setData(this.circleFc);
    }

    paramsToObject(entries) {
        const result = {}
        for(const [key, value] of entries) { // each 'entry' is a [key, value] tupple
          result[key] = value;
        }
        return result;
    }

    // handle search params
    handleSearchParams() {
        let searchParams = window.location.search;
        const params = new URLSearchParams(searchParams);
        let mode = params.get('mode');
        this.paramsObject = this.paramsToObject(params);

        console.log(mode);
        if(!mode) {
            let section = document.querySelector(".legend-container");
            section.style.top = "150px";
            section.classList.remove("d-none");
            document.querySelector(".filter-tab").classList.remove("d-none");

            document.querySelector(".styles-toggler").classList.remove("d-none");
            return;
        }

        let mapIds = {"Street":"streets-v12", "Dark":"dark-v11"};
        let styleId = "streets-v12";
        let average_asking_psf = "No";

        // commercial tool
        this.commercial = ['Local Bank', 'Foreign Bank', 'McDonald', 'Starbucks'];
        document.querySelector("#commercial-select").setValue(this.commercial);

        // ammenities
        let selectedAmmenities = ['Tier 1 Shopping Malls', 'Shopping Malls', 'Medical Center', 'Primary Chinese School', 'International School', 'Golf Club', 'Existing Job Creation', 'Future Job Creation']
        document.querySelector("#amenities-select").setValue(selectedAmmenities);
        let { is_new_project, no_of_bedroom } = this.paramsObject;

        switch(mode) {
            case 'market_value':
               
                if(is_new_project == "true") {
                    this.filterObject.property = ['Condominium', 'Service Residence'];
                    document.querySelector('#property-select').setValue(['Condominium', 'Service Residence']);
                }

                document.querySelector('#bedrooms-select').setValue("General");
                styleId = mapIds['Street'];
                average_asking_psf = "Yes";

                break;
            case 'whole_unit_rental':
                if(is_new_project == "true") {
                    this.filterObject.property = ['Condominium', 'Service Residence'];
                    document.querySelector('#property-select').setValue(['Condominium', 'Service Residence']);
                }

                this.filterObject.category = ["Subsale"];
                document.querySelector('#category-select').setValue(["Subsale"]);
                
                if(no_of_bedroom && ["1","2","3","4", "studio"].indexOf(no_of_bedroom) != -1) {
                    let bedroomObj = {
                        "1":"1 Bedroom",
                        "2":"2 Bedrooms",
                        "3":"3 Bedrooms",
                        "4":"4 Bedrooms",
                        "studio":"Studio"
                    };

                    this.filterObject.bedrooms = bedroomObj[no_of_bedroom];
                    document.querySelector('#bedrooms-select').setValue(bedroomObj[no_of_bedroom]);
                }

                average_asking_psf = "No";
                styleId = mapIds['Dark'];
                break;
            case 'room_rental':        
                this.heatmaps = ['Room Rental Data']
                document.querySelector("#rental-select").setValue(this.heatmaps);

                styleId = mapIds['Dark'];
                break;
            case  'airbnb':
                this.heatmaps = [ 'Airbnb Short Term Rental'];
                document.querySelector("#rental-select").setValue(this.heatmaps);
                styleId = mapIds['Dark'];
                break;
            default:
                styleId = mapIds['Street'];
                break;
        };

        if(average_asking_psf) {
            let section = document.querySelector(".legend-container");
            if(average_asking_psf == "Yes") {
                section.classList.remove("d-none");
            } else {
                section.classList.add("d-none");
            }
        } 

        if(this.paramsObject.latitude && this.paramsObject.longitude) {
            let {latitude, longitude} = this.paramsObject;
            this.createCircle(latitude, longitude);
        }

        if(this.paramsObject.zoom) {
            let { zoom } = this.paramsObject;

            if(zoom == "true") {
                this.map.doubleClickZoom.enable();
                this.map.scrollZoom.enable();
                this.map.boxZoom.enable();
            } else {
                this.map.doubleClickZoom.disable();
                this.map.scrollZoom.disable();
                this.map.boxZoom.disable();
            }
        }

        console.log(styleId);
        if(styleId !== "dark-v11") {
            this.handleStyleChange(styleId);
        } else {
            const interval2 = setInterval(() => {
                if(this.map.loaded()) {

                    console.log("Filter Items");
                    this.handleFilterListing();

                    this.toggleHeatmaps();
                    this.toggleAmmenities();
                    this.toggleCommercial();

                    this.handleFilterListing();
                   

                    clearInterval(interval2);
                }
            }, 50);
            
        }
        
    }



}


const realEstateProject = new RealEstateProject(map, FILTER_OBJECT, LAYERS_OBJECT, TrainLines);
realEstateProject.loadData();
// realEstateProject.loadStationsData();
