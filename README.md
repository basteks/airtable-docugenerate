# Airtable Docugenerate
Airtable scripts that allow you to generate documents from your data using the DocuGenerate API, based on the [Airtable Extensions](https://support.airtable.com/docs/airtable-extensions-overview).

## Usage

- the content of the .js file (see beelow for which file to chose) needs to be copied in a new [Scripting Extension](https://support.airtable.com/docs/en/scripting-extension-overview) in your Airtable base (warning, Extensions are not available with free plan !)
- using this scripts requires the creation of an account on the [DocuGenerate platform](https://docugenerate.com). DocuGenerate offers free plan with limitations on the number of templates and of the monthly amount of generated documents.
- using this script also requires a [DocuGenerate template](https://www.docugenerate.com/help/templates/) : a document with placeholders - or tags - that will be replaced by your data to generate the final document. For each tag, you can choose a replacement rule among the following :
  - _Base's name_ : the name of the database
  - _Table's name_ : the name of the table
  - _Today's date_ : the date of today. You can choose between fr-FR (DD/MM/YYYY) and en-US (MM/DD/YYYY) date format
  - _Time right now_ : the current time. You can choose between fr-FR (24h based) and en-US (12h based) time format
  - _Record field_ : a specific field of your table (except an image type field, see bellow)
  - _Image field_ : an image type field of your table

Once you create your Extension, access the settings page by clicking the gear icon that appears when hovering over the upper right corner.

## Single record to single document script (s2s-docugenerate-airtable.js)

### Settings

- _Record table_: the table containing the records you will use to replace your template's tags
- _DocuGenerate API Key_: your API Key from the DocuGenerate platform. Get it from [https://app.docugenerate.com/settings](https://app.docugenerate.com/settings) once you've created your account
- _DocuGenerate ID of the template_: the ID of your template. Get it from the URL of your template on DocuGenerate which looks like `https://app.docugenerate.com/templates/ID_OF_THE_TEMPLATE`. It is composed of twenty alphanumeric characters.
- _DocuGenerate config field_ (text type field): the field used to store the configuration of relationships between your template and your fields
- _Document storage field_ (either URL or File type field): the field used to store your document
- _Output format_: output format of the generated document. The options are _.docx_, _.pdf_, _.doc_, _.odt_, _.txt_ or _.html_

### Limitations
This script allows you to create one single document for one single record. All the data has to been stored in the same table. You can use [lookup fields](https://support.airtable.com/docs/lookup-field-overview) to achieve this.

### ToDo
- Detect the linked fields with multiple values or the multi-select fields to allow a one record to multiple documents generation

## Multiple records to multiple documents script (m2m-docugenerate-airtable.js)

### Settings

The settings are the same as before, with just a few additions :

- _Record view_ : the view you want to generate all the documents for

The next options take profit of the [DocuGenerate generate document API](https://api.docugenerate.com/#/Document/generateDocument):

- _Single file_ : choose if generated documents will be combined in a single file. Options are yes or no
- _Page break_ : whether to add a page break after each document (only applies if single_file is set to yes)

## Credits
Based on the great [DocuGenerate](https://docugenerate.com) platform !

