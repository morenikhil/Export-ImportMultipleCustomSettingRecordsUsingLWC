import { LightningElement, wire } from 'lwc';

//=======Start===display Populate Custom setting Picklist values ==============
import {exportCSVFile} from 'c/utils';
import getAllCustomSettings from '@salesforce/apex/ImportAndExportCustomSettingController.getAllCustomSettings';
import getCustomSettingHeaders from '@salesforce/apex/ImportAndExportCustomSettingController.getCustomSettingHeaders';
import getCustomSettingData from '@salesforce/apex/ImportAndExportCustomSettingController.getCustomSettingData';
import {ShowToastEvent} from 'lightning/platformShowToastEvent';
import loadData from '@salesforce/apex/ImportAndExportCustomSettingController.loadData';

//=======End====display Populate Custom setting Picklist values================

const MAX_FILE_EXPORT = 30;
const MAX_FILE_IMPORT = 10;

export default class ImportAndExportCustomSetting extends LightningElement {
    lstCustomSettingOptions;
    selectedCustomSetting;
    selectedExportSystemFieldsAsWell = false;
    isShowSpinner = false;
    checkedExport = true;
    checkedImport = false;
    uploadedFile;
    totalFileUploaded = 0;
    totalSuccess = 0;
    importFileResult = [];
    importFileResultHeader = {
        fileName:"File Name",
        recordName:"Record Name",
        errorMessage:"Error Message"
    }

    @wire( getAllCustomSettings)
    wiredGetAllCustomSettings( { error, data } ) {
        if (data) {            
            this.lstCustomSettingOptions = data.map( customSetting=> {
                return {
                    label: `${customSetting.MasterLabel}`,
                    value: `${customSetting.QualifiedApiName}`
                };
            });
        } else if ( error ) {
            console.error( JSON.stringify( error ) );
        }
    }

    handleChange(event){
        let name = event.target.name;
        switch(name){
            case 'Export':
                this.checkedExport = event.detail.checked;
                this.checkedImport = !this.checkedExport;
                break;
            case 'Import':
                this.checkedImport = event.detail.checked;
                this.checkedExport = !this.checkedImport;
                break;
            default:
                break;
        }
    }

    //================================================Export Start======================================================
    handleExportCustomSettingChange(event) {
        this.selectedCustomSetting = event.detail.value;
        this.validateExportFileCount();
    }

    handleExportSystemFieldsAsWellChange(event) {
        this.selectedExportSystemFieldsAsWell = event.detail.checked;
    }

    handleExport(event){
        if(this.selectedCustomSetting && this.selectedCustomSetting.length > 0){
            if(!this.validateExportFileCount()){
                return;
            }

            let count = 0;
            
            do{
                if(this.selectedCustomSetting.length > count){
                    this.setTimeOutFn(count);
                }
                count++;
            }while(count < MAX_FILE_EXPORT)
        }
    }

    setTimeOutFn(count){
        let selectedCustomSetting = this.selectedCustomSetting;
        setTimeout(()=>{
            this.exportCSVFileOneByOne(selectedCustomSetting[count]);
        },1000, count);
    }

    async exportCSVFileOneByOne(customSettingName){
        this.isShowSpinner = true;

        let customSettingAPIName = this.lstCustomSettingOptions.find(item => { return customSettingName == item.value;}).value;

        let csvHeader = await getCustomSettingHeaders({customSettingName: customSettingName, isExportAll : this.selectedExportSystemFieldsAsWell}).then(data=>{
            return data;
        });

        let recordData = await getCustomSettingData({customSettingName: customSettingName}).then(data=>{
            return data;
        });

        exportCSVFile(csvHeader, recordData, customSettingAPIName);
        this.isShowSpinner = false;
    }

    validateExportFileCount(){
        let isValid = true;
        if(this.selectedCustomSetting && this.selectedCustomSetting.length > MAX_FILE_EXPORT){
            this.showToast("Error","Please choose custom setting less than " + MAX_FILE_EXPORT + " for export !!");
            isValid = false;
        }
        return isValid;
    }
    //================================================Export Over======================================================
    //================================================Import Start======================================================
    
    handleImportCustomSettingChange(event) {
        this.selectedCustomSetting = event.detail.value;
        this.validateImportFileCount();
    }

    handleUploadFinished(event) {
        this.uploadedFile = event.detail.files;
        this.totalSuccess = 0;
        this.totalFileUploaded = 0;
    }

    handleImport(event){
        if(!this.validateImportFileCount()){
            return;
        }
        if(this.validateFileImport()){
            //this will ensure only custom setting related file will be loaded into salesforce
            this.selectedCustomSetting.forEach(customSettingName =>{
                let fileUploaded = this.uploadedFile.find(fileOption => fileOption.name.startsWith(customSettingName));
                if(fileUploaded){
                    this.totalFileUploaded++;
                    this.loadDataOneByOne(fileUploaded, customSettingName, (this.selectedCustomSetting.length == this.totalFileUploaded) );
                }
            });
        }
    }

    validateFileImport(){
        let isValid = true;
        //note Import file must have exact same API Name of Custom Setting
        //1. check If file is available for selected custom setting ?
        let fileNotAvailableForCustomSettingNames = [];
        if(this.uploadedFile && this.uploadedFile.length > 0){
            this.selectedCustomSetting.forEach(customSettingName =>{
                let fileUploaded = this.uploadedFile.find(fileOption => fileOption.name.startsWith(customSettingName));
                if(!fileUploaded){
                    fileNotAvailableForCustomSettingNames.push(customSettingName);
                }
            });
            if(fileNotAvailableForCustomSettingNames.length == this.selectedCustomSetting.length){
                this.showToast("Error", "Please choose correct file to upload, as per insturction");
                isValid = false;
            }else if(fileNotAvailableForCustomSettingNames.length > 0){
                this.showToast("Info", "We have not found file for custom Setting Names: " + fileNotAvailableForCustomSettingNames.join(',') + " . For Other custom setting we have found file those will be loaded.");   
            }
        }else{
            this.showToast("Warning", "Please select file to import");
            isValid = false;
        }
        return isValid;
    }

    async loadDataOneByOne(fileUploaded, customSettingName, isLastFile){
        this.isShowSpinner = true;
        await loadData( { contentDocumentId : fileUploaded.documentId, customSettingName : customSettingName } )
            .then( result => {
                if(result && result.length == 0){
                    this.showToast("Success", customSettingName + " uploaded successfully !!");
                    this.totalSuccess++;
                }else{
                    this.showToast("Error", "Error Occur while importing file");
                    let tempFileResult = this.importFileResult;
                    this.importFileResult = tempFileResult.concat(result);
                }
                this.isShowSpinner = false;

                if(isLastFile){
                    this.totalFileUploaded = 0;
                    if(this.importFileResult.length > 0){
                        exportCSVFile(this.importFileResultHeader, this.importFileResult, "Error Records");   
                    }
                }
            })
            .catch( error => {
                let errorMessage = error.body ? error.body.message : error.message;
                if(errorMessage == 'Regex too complicated')
                {
                    errorMessage = 'Please upload files less than 5000 records.';
                }
                this.showToast("Error", errorMessage);
                this.isShowSpinner = false;
            });
    }


    validateImportFileCount(){
        let isValid = true;
        if(this.selectedCustomSetting && this.selectedCustomSetting.length > MAX_FILE_IMPORT){
            this.showToast("Error","Please choose custom setting less than " + MAX_FILE_IMPORT + " for import !!");
            isValid = false;
        }
        return isValid;
    }

    removeRecord(event){
        let documentId = event.detail.name;
        let tempUploadFile = this.uploadedFile.filter(fileOption => fileOption.documentId != documentId);
        this.uploadedFile = tempUploadFile ? tempUploadFile : [];
    }
    //================================================Import Start======================================================

    showToast(toastType, toastMessage){
        this.dispatchEvent(
            new ShowToastEvent( {
                title: toastType + ' !',
                message: toastMessage,
                variant: toastType.toLowerCase(),
                mode: 'dismissible'
            } ),
        );
    }
}