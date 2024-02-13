const config = input.config({
    title: 'DocuGenerate - Single pdf for single record',
    description: 'A script that lets you automate document generation from a template using DocuGenerate',
    items: [
        input.config.table('table', {
            label: 'Record table',
            //description: 'The table in which you store your records'
        }),
        input.config.text('APIKey', {
            label: 'DocuGenerate API Key ',
            description: "(get it from https://app.docugenerate.com/settings)"
        }),
        input.config.text('templateId', {
            label: 'DocuGenerate ID of the template ',
            description: "(get it from the URL of your template on DocuGenerate which looks like https://app.docugenerate.com/templates/xxxxxxxxxxxxxxxxxxxx, xxxxxxxxxxxxxxxxxxxx being your template's ID)"
        }),
        input.config.field('docuField', {
            label: 'DocuGenerate config field (must be a text type field)',
            description: "the field used to store the cofig of relationships between your template and your fields",
            parentTable: 'table',
        }),
        input.config.field('storageField', {
            label: 'Document storage field (either URL or File type field)',
            parentTable: 'table',
        }),
        input.config.select('outputFormat', {
            label: 'Output format',
            description: 'output format of the generated document. Options are .docx, .pdf, .doc, .odt, .txt or .html ',
            options: [
                {label: '.docx', value: '.docx'},
                {label: '.pdf', value: '.pdf'},
                {label: '.doc', value: '.doc'},
                {label: '.odt', value: '.odt'},
                {label: '.txt', value: '.txt'},
                {label: '.html', value: '.html'},
            ]
        })
    ]
});

async function chooseFieldFill(tagName) {
  let match = false;
  let foundField = null;
  let res = null;
  for (let f=0; f<table.fields.length; f++) {
    if (table.fields[f]['name'] == tagName) {
        foundField = table.fields[f];
        break;
    }
  }
  if (foundField != null) {
    let matchField = await input.buttonsAsync("We found a field whose name matches this tag's name. Do yuo want to use it te replace this tag?",
		  [
			  {label: "Yes", value: 'yes'},
			  {label: "No", value: 'no'},
		  ],
	  );
    if (matchField=='yes') {
      match = true;
      let fieldType = foundField.type == 'multipleAttachments' ? "image":"string";
      res = {type: fieldType, filltype: "field", filldata: foundField.id};
    }
  }
  if (!match) {
	let fieldType = await input.buttonsAsync("Choose how the ["+tagName+"] tag will be replaced.",
		[
			{label: "Base's name", value: 'basename'},
			{label: "Table's name", value: 'tablename'},
			{label: "Today's date", value: 'today'},
			{label: "Time right now", value: 'now'},
			{label: "Record field", value: 'field'},
      {label: "Image field", value: 'image'},
		],
	);
	switch (fieldType) {
		case 'basename' :
			res = {type: "string", filltype: "basename"};
			break;
		case 'tablename' :
			res = {type: "string", filltype: "tablename"};
			break;
		case 'today':
			let dateFormat = await input.buttonsAsync('Choose date format',
			[
				{label: "fr-FR (DD/MM/YYYY)", value: "fr-FR"},
				{label: "en-US (MM/DD/YYYY)", value: "en-US"}
			]);
			//const today = new Date(Date.now()).toLocaleDateString(dateFormat);
			res = {type: "string", filltype: "today", filldata: dateFormat};
			break;
		case 'now':
			let timeFormat = await input.buttonsAsync('Choose time format',
			[
				{label: "fr-FR (24h based)", value: "fr-FR"},
				{label: "en-US (12h based)", value: "en-US"}
			]);
			//const now = new Date(Date.now()).toLocaleTimeString(dateFormat);
			res = {type: "string", filltype: "now", filldata: timeFormat};
			break;
		case 'field':
			let field = await input.fieldAsync("Pick the field for ["+tagName+"]", table);
        res = {type: "string", filltype: "field", filldata: field.id};
			break;
    case 'image':
      let image = await input.fieldAsync("Pick the image field for ["+tagName+"]", table);
      res = {type: "image", filltype: "field", filldata: image.id};
      break;
	}
  }
	return res;
}

function findTag(obj, idx, tagsToLookIn=[]) {
  if (tagsToLookIn.length==0) { tagsToLookIn = tags; }
  let found = false;
  for (let t=0;t<tagsToLookIn.length;t++) {
    if (tagsToLookIn[t].name === Object.keys(obj)[idx] || tagsToLookIn[t] === Object.keys(obj)[idx]) { 
      if (Object.values(obj)[idx].type === 'string' || Object.values(obj)[idx].type === 'image') {
        output.text("["+Object.keys(obj)[idx]+"] found !");
        if (Object.values(obj)[idx].filltype != 'field') {
          found = true;
          break;
        }
        else {
          for (let field of table.fields) {
            if (field.id == Object.values(obj)[idx].filldata) {
              found = true;
              break;
            }
          }
        }
      }
      else if (Object.values(obj)[idx].type === 'List'){
        output.markdown("["+Object.keys(obj)[idx]+"] found ! **List tag** ");
        if (Object.values(obj)[idx].filltype != 'field' || Object.values(obj)[idx].filltype != 'image') {
          found = true;
          break;
        }
        else {
          for (let field of table.fields) {
            if (field.id == Object.values(obj)[idx].filldata) {
              found = true;
              break;
            }
          }
        }
      }
      else {
        output.markdown("["+Object.keys(obj)[idx]+"] found ! **Object tag** > looking for every items");
        let multifound = true;
        for (let k=1;k<Object.keys(Object.values(obj)[idx]).length;k++) {
          multifound = multifound && findTag(Object.values(obj)[idx],k,Object.values(tagsToLookIn[t].items));
        }
        found = multifound;
      }
    }
  }
  return found;
}

async function imageUrlToBase64(url) {
  const data = await fetch(url);
  const blob = await data.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      const base64data = reader.result;
      resolve(base64data);
    };
    reader.onerror = reject;
  });
};

async function displayTagRule(record,obj,verbose = false) {
  let ruleStr = "";
  let rules = [];
  switch (obj.filltype) {
    case 'basename' :
      ruleStr = base.name;
      if (verbose) { ruleStr += " (name of the base)";}
      break;
    case 'tablename' :
      ruleStr = table.name;
      if (verbose) { ruleStr += " (name of the table)";}
      break;
    case 'today':
      ruleStr = new Date(Date.now()).toLocaleDateString(obj.filldata);
      if (verbose) { ruleStr += " (today's date)";}
      break;
    case 'now':
      ruleStr = new Date(Date.now()).toLocaleTimeString(obj.filldata);
      if (verbose) { ruleStr += " (time now)";}
      break;
    case 'field':
      for (let field of table.fields) {
        if (field.id == obj.filldata) {
          if (obj.type == "string") {
            let data = record.getCellValue(field.name);
            if (data.constructor == Array) {
              for(let i=0;i<data.length;i++){
                if(Object.keys(data).length==1){ 
                  if('name' in data[i]){ 
                    rules.push(data[i]['name']); 
                    if (verbose) { rules[rules.length-1] += " ("+field.name+" field)";}
                  }
                } else { 
                  rules.push(data[i]);
                  if (verbose) { rules[rules.length-1] += " ("+field.name+" field)";}
                }
              }
            } else {
              ruleStr = record.getCellValueAsString(field.name);
              if (verbose) { ruleStr += " ("+field.name+" field)";}
            }
          }
          else {
            var photo = record.getCellValueAsString(field.name);
            if (photo!="") {
				let url = photo.split('(')[1].split(')')[0];
				let base64img = await imageUrlToBase64(url);
				ruleStr = verbose? "data:image/jpeg;base64":base64img;
			} else {
				ruleStr="";
			}
          }
          break;
        }
      }
      break;
  }
  if (rules.length==0){ return ruleStr; }
  else{ return rules; }
}

function checkField(record,obj) {
  let res = true;
  if (obj.filltype == 'field') {
      for (let field of table.fields) {
        if (field.id == obj.filldata) {
          if (record.getCellValueAsString(field.name)=="") {
            res = false;
            break;
          }
        }
      }
  }
  return res;
}

function checkFieldsData(record) {
  let missingFields = [];
  for (let o=0;o<Object.keys(storedOptions).length;o++) {
    if (Object.values(storedOptions)[o].type == "string") {
      if (!checkField(record,Object.values(storedOptions)[o])) {
        missingFields.push(Object.keys(storedOptions)[o]);
      }
    }
    else {
      for (let i=1;i<Object.keys(Object.values(storedOptions)[o]).length;i++) {
        if (!checkField(record,Object.values(Object.values(storedOptions)[o])[i])) {
          missingFields.push(Object.keys(Object.values(storedOptions)[o][i]));
        }
      }
    }
  }
  return missingFields
}

async function displayTagRules(record,verbose=false) {
  let tagRules = {};
  for (let o=0;o<Object.keys(storedOptions).length;o++) {
    //output.inspect(Object.keys(storedOptions)[o]);
    //output.inspect(Object.values(storedOptions)[o]);
    if (Object.values(storedOptions)[o].type == "string" || Object.values(storedOptions)[o].type == "image") {
      tagRules[Object.keys(storedOptions)[o]] = await displayTagRule(record,Object.values(storedOptions)[o],verbose);
    }
    else if (Object.values(storedOptions)[o].type == "List") {
      tagRules[Object.keys(storedOptions)[o]] = [];
      //let obj = [];
      if (Object.values(Object.values(storedOptions)[o])[1].filltype == "field") {
        for (let field of table.fields) {
          if (field.id == Object.values(Object.values(storedOptions)[o])[1].filldata) {
            let data = record.getCellValue(field.name);
            for (let i=0;i<data.length;i++){
                if(typeof(data[i]=="object")) {
                  if(Object.keys(data[i]).indexOf("name")>-1) {
                    tagRules[Object.keys(storedOptions)[o]].push(data[i]['name']);
                  }
                  else { tagRules[Object.keys(storedOptions)[o]].push(data[i]); }
                }
                else {
                  tagRules[Object.keys(storedOptions)[o]].push(data[i]);
                }
            }
            break;
          }
        }
      }
    }
    else {
      tagRules[Object.keys(storedOptions)[o]] = [];
      let obj = {};
      //let objs = [];
      for (let i=1;i<Object.keys(Object.values(storedOptions)[o]).length;i++) {
        let key = Object.keys(Object.values(storedOptions)[o])[i];
        let val = await displayTagRule(record,Object.values(Object.values(storedOptions)[o])[i],verbose);
        if (val.constructor == Array){
          for (let j=0;j<val.length;j++) {
            obj = {};
            obj[[key]] = val[j]
            tagRules[Object.keys(storedOptions)[o]].push(obj);
          }
        } else { obj[[key]] = val; }
      }
      output.inspect(tagRules[Object.keys(storedOptions)[o]]);
      if (tagRules[Object.keys(storedOptions)[o]].length==0) { tagRules[Object.keys(storedOptions)[o]].push(obj); }
    }
  }
  return tagRules;
}

function onlyUnique(value, index, array) {
  return array.indexOf(value) === index;
}

//// Algorithm's beginning ////
//////// Variables definition //////
const table = config.table;
const APIKey = config.APIKey;
const templateId = config.templateId;
const docuField = config.docuField;
const storageField = config.storageField;
const outputFormat = config.outputFormat;
//////// Template analysis (get template info via API) //////
var tags= [];
output.markdown("# Template analysis")
const options = {
	method: 'GET',
	headers: {
	  accept: 'application/json',
	  authorization: APIKey
	}
};
var status = -1;
let templateResponse = await fetch('https://api.docugenerate.com/v1/template/'+templateId, options)
.then(response => {
  status = response.status;
  return response.json()
})
.catch(err => console.log(err));
////// Inspect templateResponse for debug purpose //////
//output.inspect(templateResponse);
if (status< 200 || status >= 300){
    	output.text(status + " error : "+templateResponse.message)
}
else {
  /////// Tag error in the template //////
  if ('tags' in templateResponse && 'invalid' in templateResponse.tags && templateResponse.tags.invalid.length>0) {
    output.text("Tag error in your template, the following tags are invalid. Please modify your template.");
    output.table(templateResponse.tags.invalid);
  }
  else if ('tags' in templateResponse && 'valid' in templateResponse.tags){
    ////// No tags //////
    if (templateResponse.tags.valid.length==0) {
      output.text("Error : no tag found in your template, please modify your template.");
    }
    else {
      ////// Template analysis summary //////
      output.text("Name of the template : "+templateResponse.name);
      for (let t=0; t<templateResponse.tags.valid.length; t++) {
        let validTag = templateResponse.tags.valid[t];
        ////// String tag //////
        if (typeof(validTag)==="string") {
          tags.push({type: typeof(validTag), name: validTag});
        }
        ////// Object tag //////
        else if (typeof(validTag)==="object") {
          ////// List tag //////
          if (Object.values(validTag)[0].length==1 && Object.values(validTag)[0][0]==".") {
            tags.push({type: typeof(validTag), name: Object.keys(validTag)[0]});
          }
          else {
            if (templateResponse.enhanced_syntax && Object.keys(validTag)[0].indexOf('.')>-1) {
              tags.push({type: typeof(validTag), name: Object.keys(validTag)[0].split('.')[0], items: [Object.keys(validTag)[0].split('.')[1],Object.values(validTag)[0]].filter(onlyUnique)});
            }
            else {
              tags.push({type: typeof(validTag), name: Object.keys(validTag)[0], items: Object.values(validTag)[0]});
            }
          }
        }
      }
      output.text("List of available tags :")
      output.table(tags);
    }
  }
  //////// End of template analysis //////
  //////// Tags analysis //////
  var record = await input.recordAsync('Pick a record', table);
  if (record) {
    output.markdown("# Tags analysis");
    let storedOptionsField = record.getCellValueAsString(docuField);
    if (storedOptionsField != "") {
      var storedOptions = JSON.parse(storedOptionsField);
      var error = false;
      //TODO : keep valid settings and reset options only for invalid or missing tags
      if (tags.length != Object.keys(storedOptions).length) {
        error = true;
      }
      else {
        for (let k=0;k<Object.keys(storedOptions).length;k++) {
          let found = false;
          output.markdown("## ["+Object.keys(storedOptions)[k]+"] tag");
          found = findTag(storedOptions,k);
          if (!found) {
            error = true;
            break;
          }
        }
      }
    }
    else { error = true; }
    ////// Resetting the tag settings //////
    if (error) {
      output.text("No stored options, or error while getting them. Let's configure tag options again.");
      storedOptions = {};
      for (let t=0; t<tags.length; t++) {
        if (tags[t].type == "string") {
          output.markdown("## ["+tags[t].name+"] tag");
          let option = await chooseFieldFill(tags[t].name)
          storedOptions[tags[t].name]=option;
        }
        else {
          output.markdown("## ["+tags[t].name+"] tag");
          if (templateResponse.enhanced_syntax && !("items" in tags[t])) {
            output.text("This is a list tag");
            var tagConfig = {type: "List"};
            let option = await chooseFieldFill(tags[t].name);
            tagConfig["data"]=option;
          }
          else {
            output.text("This is an object tag, it contains the following tags :");
            output.table(tags[t].items);
            var tagConfig = {type: "Object"}
            for (let i=0;i<tags[t].items.length;i++) {
              let option = await chooseFieldFill(tags[t].items[i]);
              tagConfig[tags[t].items[i]]=option;
            }
          }
          storedOptions[tags[t].name] = tagConfig;
        }
      }
      error = false;
    }
    if (!error) {
      output.markdown("**✅ Tags' replacement successfully set as following:**");
      output.table(await displayTagRules(record,true));
      await table.updateRecordAsync(record, {[docuField.name]: JSON.stringify(storedOptions)});
      let propagateOptions = await input.buttonsAsync('Would you like to propagate these settings among a view?', ['Yes', 'No']);
      if (propagateOptions == "Yes") { 
        let view = await input.viewAsync("Pick view",table);
        let queryResult = await view.selectRecordsAsync({fields: [docuField]});
        let updateOptions = [];
        for (let propRecord of queryResult.records) {
          updateOptions.push({id: propRecord.id, fields:{[docuField.name]: JSON.stringify(storedOptions)}});
        }
        while (updateOptions.length>0) {
          const nFirst = updateOptions.splice(0,Math.min(50,updateOptions.length));
          await table.updateRecordsAsync(nFirst);
        }
      }
    }
    //////// End of tags analysis ////////
    //////// Document generation ////////
    output.clear();
    if (storageField.type =="url" || storageField.type == "multipleAttachments"){
      output.markdown("# Document generation");
      output.markdown("_Please wait while the document is being generated..._")
      let missingFields = checkFieldsData(record);
      if (missingFields.length==0) {
        //console.log(JSON.stringify([await displayTagRules()]));
        const options = {
            method: 'POST',
            headers: {
              accept: 'application/json',
              'content-type': 'application/json',
              authorization: APIKey
            },
            body: JSON.stringify({
              template_id: templateId,
              data: [await displayTagRules(record)],
              //name: "Attestation d'entrée en formation",
              //output_name: "Attestation_entree_formation",
              output_format: outputFormat,
              output_quality: 100
              })
        };
        var status = -1;
        let docResponse = await fetch('https://api.docugenerate.com/v1/document', options)
        .then(response => {
          status = response.status;
          return response.json()
        })
        .catch(err => console.log(err));

        if (status< 200 || status >= 300){
          console.log("Erreur "+docResponse.statusCode+": "+docResponse.message)
        }
        else {
          if (storageField.type == 'url') {
            await table.updateRecordsAsync([
              {
                  id: record.id,
                  fields: { [storageField.name]: docResponse.document_uri }
              }
            ]);
          }
          else if (storageField.type == 'multipleAttachments'){
            await table.updateRecordsAsync([
              {
                  id: record.id,
                  fields: { [storageField.name] : [{url:docResponse.document_uri}] }
              }
            ]);
          }
          output.markdown("**✅ Document successfully generated !**");
          output.markdown("If you're in Free plan, please check the number of generated documents on [https://app.docugenerate.com/settings](https://app.docugenerate.com/settings)");
          output.markdown("_Script completed successfully_");
        }
    } else {
      output.markdown("**⚠ Error, the document has not been generated!**");
      output.markdown("List of the missing data :")
      output.table(missingFields);
    }
    }
    else {
      output.text("Please verify the type of your storage field : it should be URL or File (current : "+storageField.type+")");
    }
  }
}
