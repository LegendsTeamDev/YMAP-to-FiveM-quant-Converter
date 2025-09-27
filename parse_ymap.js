#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function parseYmap(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const props = [];

        // Match all CEntityDef items
        const itemRegex = /<Item type="CEntityDef">([\s\S]*?)<\/Item>/g;
        let match;

        while ((match = itemRegex.exec(content)) !== null) {
            const itemContent = match[1];

            // Extract prop model
            const modelMatch = itemContent.match(/<archetypeName>(.*?)<\/archetypeName>/);
            if (!modelMatch) continue;

            const propModel = modelMatch[1];

            // Extract position
            const posMatch = itemContent.match(/<position x="([\-\.\d]+)" y="([\-\.\d]+)" z="([\-\.\d]+)"\/>/);
            if (!posMatch) continue;

            const position = {
                x: parseFloat(posMatch[1]),
                y: parseFloat(posMatch[2]),
                z: parseFloat(posMatch[3])
            };

            // Extract rotation quaternion
            const rotMatch = itemContent.match(/<rotation\s+[^>]*x="([\-\.\d]+)"\s+[^>]*y="([\-\.\d]+)"\s+[^>]*z="([\-\.\d]+)"\s+[^>]*w="([\-\.\d]+)"/i);
            let qx = 0, qy = 0, qz = 0, qw = 1;

            if (rotMatch) {
                qx = parseFloat(rotMatch[1]);
                qy = parseFloat(rotMatch[2]);
                qz = parseFloat(rotMatch[3]);
                qw = parseFloat(rotMatch[4]);
            }

            // Conjugate the quaternion for FiveM (flip x, y, z components)
            qx = -qx;
            qy = -qy;
            qz = -qz;
            // qw stays the same

            // Normalize the quaternion to ensure unit length
            const len = Math.hypot(qx, qy, qz, qw);
            if (len > 0) {
                qx /= len;
                qy /= len;
                qz /= len;
                qw /= len;
            }

            props.push({
                prop: propModel,
                position: position,
                quaternion: {
                    x: qx,
                    y: qy,
                    z: qz,
                    w: qw
                }
            });
        }

        return props;

    } catch (error) {
        console.error('Error reading file:', error);
        return null;
    }
}

function generateLuaTable(props, setNumber = 8) {
    let output = `    [${setNumber}] = { -- Parsed from YMAP (${props.length} props) - with conjugated quaternions\n`;

    for (const prop of props) {
        output += `        {prop = \`${prop.prop}\`, `;
        output += `pos = vec3(${prop.position.x.toFixed(2)}, ${prop.position.y.toFixed(2)}, ${prop.position.z.toFixed(2)}), `;
        output += `quat = {x = ${prop.quaternion.x.toFixed(6)}, y = ${prop.quaternion.y.toFixed(6)}, z = ${prop.quaternion.z.toFixed(6)}, w = ${prop.quaternion.w.toFixed(6)}}},\n`;
    }

    output += '    },';
    return output;
}

// Main execution
console.log('=================================');
console.log('YMAP Parser v3 - Conjugated Quaternions');
console.log('=================================\n');

// Allow passing file path as argument, default to sample_ymap.xml
const inputFile = process.argv[2] || 'sample_ymap.xml';
const filePath = path.isAbsolute(inputFile) ? inputFile : path.join(__dirname, inputFile);

console.log('Parsing file:', filePath);

const props = parseYmap(filePath);

if (props && props.length > 0) {
    console.log(`\nFound ${props.length} props in the YMAP file\n`);

    // Generate Lua table
    const luaTable = generateLuaTable(props);

    console.log('Props Config with conjugated quaternions:');
    console.log('-----------------------------------------');
    console.log(luaTable.substring(0, 800) + '...\n');

    // Save to file
    const outputPath = path.join(__dirname, 'parsed_props_quat.txt');
    fs.writeFileSync(outputPath, '-- Props with vec3 position and conjugated quaternion rotation\n-- Use with CreateObject and SetEntityQuaternion\n\n' + luaTable);

    console.log(`Output saved to: ${outputPath}`);

    // Show summary
    console.log('\nSummary by prop type:');
    console.log('---------------------');
    const propCounts = {};
    for (const prop of props) {
        propCounts[prop.prop] = (propCounts[prop.prop] || 0) + 1;
    }

    for (const [propName, count] of Object.entries(propCounts)) {
        console.log(`  ${propName}: ${count} instances`);
    }

    // Show quaternion analysis
    console.log('\nQuaternion Analysis:');
    console.log('--------------------');
    let rotatedCount = 0;
    for (const prop of props) {
        // Check if quaternion is not identity (w=1, x=y=z=0)
        const q = prop.quaternion;
        if (Math.abs(q.x) > 0.001 || Math.abs(q.y) > 0.001 || Math.abs(q.z) > 0.001 || Math.abs(q.w - 1) > 0.001) {
            rotatedCount++;
        }
    }
    console.log(`  Props with rotation: ${rotatedCount}/${props.length}`);
    console.log(`  Props without rotation: ${props.length - rotatedCount}/${props.length}`);

    // Show example of first few props with quaternions
    console.log('\nExample props with conjugated quaternion:');
    console.log('-----------------------------------------');
    let shown = 0;
    for (const prop of props) {
        const q = prop.quaternion;
        if ((Math.abs(q.z) > 0.001 || Math.abs(q.w - 1) > 0.001) && shown < 3) {
            console.log(`  ${prop.prop}: Quat(x=${q.x.toFixed(4)}, y=${q.y.toFixed(4)}, z=${q.z.toFixed(4)}, w=${q.w.toFixed(4)})`);
            shown++;
        }
    }

} else {
    console.log('No props found or error parsing file');
}