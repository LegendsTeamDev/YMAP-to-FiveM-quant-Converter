# YMAP to FiveM Props Converter
### This is a simple tool to convert props from a YMAP file to a table sutiable for usage in a FiveM server enviroment!

## Usage for legends_airdrop
**To convert a YMAP file to a props table that will be used for legends_airdrop please follow the steps below**

1. Open `.xml` editor like OpenIV and copy the contents of your YMAP.
2. Place the copied code from your YMAP file in this directory as `sample_ymap.xml`
3. Run: `node parse_ymap.js`
4. Copy the generated Lua table from `parsed_props_quat.txt` into your `props_config.lua` and change the index number for the building set (by default it will be set to 8)