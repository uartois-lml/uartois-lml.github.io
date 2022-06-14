const fileSelector = document.getElementById('file-selector');
const aButtons = document.getElementById("animationButtons");
const speedInput = document.getElementById("speedInput")

const DEFAULT_COLOR = 'rgb(255, 0, 0, 0.14)';

// json's file datas
let datas = [];

// json's keys
let keys = [];

//parts
let parts = {
    arm: 'rgb(255, 0, 0, 0.8)',
    hand: 'rgb(255, 0, 0, 0.14)',
    leg: 'rgb(0, 0, 255, 0.14)',
    foot: 'rgb(0, 0, 255, 0.14)',
    neck: 'rgb(0, 255, 0, 0.14)',
    head: 'rgb(0, 255, 0, 0.14)',
    spine: 'rgb(88, 41, 0, 0.14)',
    body: 'rgb(88, 41, 0, 0.14)',
    root: 'rgb(88, 41, 0, 0.14)',
    hips: 'rgb(88, 41, 0, 0.14)',
};

//traces for Plotly.animate
let traces = [];

// all the datas formatted
let loadedDatas = []

// Actual step of the animation
let stepIndex = 1;

// Step when the Stop button have been pressed
let stopIndex = 1;

// If the animation has been launched or not
let isAnimating = false;

// The animation Speed (the refresh every x milliseconds) seems to be caped
let animationSpeed = 0

// How many index will the animation skip between two steps
let indexJump = 1

// Values used to correctly scale the plot layout
let xMin,
    yMin,
    zMin;
let xMax,
    yMax,
    zMax;

// Declare of the interval variable wich allows to display things over time
let interval;

// aButtons.style.display = "none";

speedInput.addEventListener("input", changeSpeed);

var txt = '';
var xmlhttp = new XMLHttpRequest();
xmlhttp.onreadystatechange = function() {
    if (xmlhttp.status == 200 && xmlhttp.readyState == 4) {
        resetData();
        txt = xmlhttp.responseText;
        //console.log(txt)
        loadFromFile(txt);
    }
};
xmlhttp.open("GET", "https://uartois-lml.github.io/assets/gait-app/record_walking.json", true);
xmlhttp.send();

fileSelector.addEventListener('change', (event) => {
    //Display animation's Buttons
    //aButtons.style.display = "block";
    resetData()

    const fileList = event.target.files;
    console.log(fileList);
    //console.log(fileList[0])
    const reader = new FileReader();
    reader.addEventListener('load', (event) => {
        let resultat = event.target.result;
        loadFromFile(resultat);
    });
    reader.readAsText(fileList[0])

    //readImage(fileList[0])
});

/*
function createDico(i) {
    return {
        x: [i],
        y: [i],
        z: [i],
        mode: 'markers',
        marker: {
            size: 12,
            line: {
                color: DEFAULT_COLOR,
                width: 0.5
            },
            opacity: 0.8
        },
        type: 'scatter3d'
    };
}
*/

// return the data formated with the index and key given in parameter
function getData(key, index) {
    var retour = ''
    datas[index].forEach((elt) => {
        if (elt[0] == key) {
            retour = elt[1]
        }
    });
    myData = retour.split('(')
    myData = myData[1].split(')')
    retour = myData[0]
    myData = retour.split(',')

    return myData.map(function(elt) {
        return parseFloat(elt)
    })
}

function getPartKeys(part, myDatas) {
    var myKeys = {};
    keys.forEach((key) => {
        if (key.includes(part)) {
            var myIndex = getKeyIndex(key)
            myKeys[key] = {};
            myKeys[key]['x'] = myDatas['x'][myIndex];
            myKeys[key]['y'] = myDatas['y'][myIndex];
            myKeys[key]['z'] = myDatas['z'][myIndex];
        }
    });
    return myKeys
}

// return the index of the key given in parameter from keys tab
function getKeyIndex(key) {
    var i = 0;
    var trouve = false;
    while (!trouve && i < keys.length) {
        trouve = (keys[i++] == key)
    }
    return --i;
}

// return a dictionnary with every coordonate in x,y and z from the index given in parameter
function getDataStep(index) {
    if (index >= datas.length) {
        stopAnimate()
        return
    }

    var joints = {
        x: [],
        y: [],
        z: [],
    }
    keys.forEach((key) => {
        if (!isNaN(getData(key, 0)[0])) {
            joints['x'].push(getData(key, index)[0])
            joints['z'].push(getData(key, index)[1])
            joints['y'].push(getData(key, index)[2])
            if (index == 0 && !isNaN(xMax)) {
                xMin = Math.min(getData(key, index)[0], xMin)
                yMin = Math.min(getData(key, index)[2], yMin)
                zMin = Math.min(getData(key, index)[1], zMin)
                xMax = Math.max(getData(key, index)[0], xMax)
                yMax = Math.max(getData(key, index)[2], yMax)
                zMax = Math.max(getData(key, index)[1], zMax)
            } else if (isNaN(xMax)) {
                xMin = getData(key, index)[0]
                yMin = getData(key, index)[2]
                zMin = getData(key, index)[1]
                xMax = getData(key, index)[0]
                yMax = getData(key, index)[2]
                zMax = getData(key, index)[1]
            }
        }
    });
    return joints
}

function changeSpeed() {
    let speedValue = speedInput.value

    if (speedValue == "") {
        return
    }
    indexJump = Number(speedValue)
    if (isAnimating) {
        stopAnimate()
        resume()
    }
}

function resetData() {
    stopAnimate();
    datas = [];
    keys = [];
    loadedDatas = [];
}

function loadFromFile(resultat) {
    resultat = JSON.parse(resultat)
    resultat.forEach(element => {
        var tabTmp = []
        for (const [key, value] of Object.entries(element)) {
            //console.log(`${key}: ${value}`);
            tabTmp.push([key, value])
        }
        datas.push(tabTmp)
    });
    setDatas();
    loadDatas();
}

// launch the animation if not already, Change the second parameter
// of the setInterval function to change the speed animation
/*function animation() {
    if (!isAnimating) {
        interval = setInterval(increment, animationSpeed);
        isAnimating = true
    }
}
*/

function animation() {
    isAnimating = true
    while (stepIndex < loadedDatas.length && isAnimating) {
        nextStep();
        stepIndex += indexJump;
    }
}

// Simple incrementation used in the setInterval function
function increment() {
    stepIndex += indexJump;
    nextStep();
}

// make the animation resume where it has been stopped
function resume() {
    if (!isAnimating) {
        stepIndex = stopIndex;
        animation();
    }
}

// stop the animation
function stopAnimate() {
    if (isAnimating) {
        clearInterval(interval)
        stopIndex = stepIndex;
        stepIndex = 1;
        isAnimating = false;
    }
}


// load the next position of each points in the plot
function nextStep() {
    var joints = loadedDatas[stepIndex]
    if (joints == undefined) {
        stopAnimate();
        return;
    }

    var updateData = []
    for (const [key, value] of Object.entries(parts)) {
        myParsedDataPart = parseDataPart(getPartKeys(key, joints));
        updateData.push({
            x: myParsedDataPart['x'],
            y: myParsedDataPart['y'],
            z: myParsedDataPart['z'],
            marker: {
                size: 6,
                opacity: 0.8
            },
        });
    }
    var data = {
        data: updateData,
        traces: traces,
        layout: {}
    }

    Plotly.animate('myDiv', data, {
        transition: {
            duration: animationSpeed,
            easing: 'linear'
        },
        frame: {
            duration: animationSpeed,
        }
    });
}


function loadDatas() {
    var i = 0;
    while (i <= datas.length) {
        loadedDatas.push(getDataStep(i++))
    }
}

// Init variable: keys
function initKeys() {
    for (const [key] of datas[0]) {
        if (!isNaN(getData(key, 0)[0])) {
            keys.push(key)
        }
    }
}

function parseDataPart(myData) {
    parsedDatas = {
        x: [],
        y: [],
        z: [],
    }
    for (const [key, value] of Object.entries(myData)) {
        parsedDatas['x'].push(value['x']);
        parsedDatas['y'].push(value['y']);
        parsedDatas['z'].push(value['z']);
    }
    return parsedDatas
}

// Initiate the plot with values of the index zero
function setDatas() {
    initKeys();
    var i = 0;
    var joints = getDataStep(0);
    var data = []
    for (const [key, value] of Object.entries(parts)) {
        myParsedDataPart = parseDataPart(getPartKeys(key, joints));
        data.push({
            x: myParsedDataPart['x'],
            y: myParsedDataPart['y'],
            z: myParsedDataPart['z'],
            mode: 'markers',
            marker: {
                size: 6,
                color: value,
                line: {
                    color: 'rgb(217, 217, 217, 0.14)',
                    width: 0.5
                },
                opacity: 0.8
            },
            type: 'scatter3d'
        });
        traces.push(i++);
    };
    //console.log(data)
    var layout = {
        margin: {
            l: 0,
            r: 0,
            b: 0,
            t: 100,
        },
        scene: {
            xaxis: {
                range: [xMin - 3, xMax + 3],
            },
            yaxis: {
                range: [yMin - 3, yMax + 3],
            },
            zaxis: {
                range: [zMin - 0.5, zMax + 0.5],
            },
            aspectratio: {
                x: 1,
                y: 1,
                z: 1
            },
            width: 1000,
        },
        autoexpand: false,
        title: {
            text: "jsonPlot",
            xanchor: "center"
        },
        width: 700,
        height: 500,
        autosize: false
    };
    Plotly.newPlot('myDiv', data, layout);
}

/*
Plotly.newPlot('div', [{
    x: [1, 2, 3],
    y: [0, 0.5, 1],
    line: { simplify: false },
}], {
    height: 500,
});

function randomize() {
    Plotly.animate('div', {
        data: [{ y: [Math.random(), 1] }],
        traces: [0],
        layout: {}
    }, {
        transition: {
            duration: 500,
            easing: 'cubic-in-out'
        },
        frame: {
            duration: 500
        }
    })
}
*/