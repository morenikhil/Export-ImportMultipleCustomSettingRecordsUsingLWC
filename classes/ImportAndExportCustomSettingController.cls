public without sharing class ImportAndExportCustomSettingController {

    //======================================Export Start==============================================
    @SuppressWarnings('PMD.ApexCRUDViolation')
    @AuraEnabled(cacheable = true)
    public static List<EntityDefinition> getAllCustomSettings() {
        return [SELECT Id, Label, MasterLabel, PluralLabel, DeveloperName, QualifiedApiName, KeyPrefix, NamespacePrefix 
                FROM EntityDefinition 
                WHERE IsCustomSetting = true 
                Order by QualifiedApiName];
    }

    @AuraEnabled(cacheable = true)
    public static Map<String,String> getCustomSettingHeaders(String customSettingName, boolean isExportAll) {
        Map<String,String> headerMap = new Map<String,String>();
        Map<String,Schema.SobjectField> fieldMap = Schema.getGlobalDescribe().get(customSettingName).getDescribe().fields.getMap();
        for(String fieldAPIName : fieldMap.keySet()){
            if(isExportAll){
                headerMap.put(fieldAPIName, fieldMap.get(fieldAPIName).getDescribe().getLabel() );
            }else{
                if(fieldMap.get(fieldAPIName).getDescribe().isUpdateable()){
                    headerMap.put(fieldAPIName, fieldMap.get(fieldAPIName).getDescribe().getLabel() );   
                }
            }
        }
        return headerMap;
    }

    @SuppressWarnings('PMD.ApexCRUDViolation')
    @AuraEnabled(cacheable = true)
    public static List<SObject> getCustomSettingData(String customSettingName) {
        Map<String,Schema.SobjectField> fieldMap = Schema.getGlobalDescribe().get(customSettingName).getDescribe().fields.getMap();
        return Database.query('SELECT ' + String.join( new List<String>(fieldMap.keySet()), ',')  + ' FROM ' + String.escapeSingleQuotes(customSettingName ) );
    }

    //======================================Export End==============================================

    //======================================Import Start==============================================

    @SuppressWarnings('PMD.ApexCRUDViolation,PMD.CognitiveComplexity')
    @AuraEnabled
    public static List<ResultWrapper> loadData( Id contentDocumentId, String customSettingName ) {
        List<SObject> lstSObjectToInsert = new List<SObject>();
        List<ResultWrapper> lstResultWrapper = new List<ResultWrapper>();

        ContentVersion objContentVersion = [ SELECT Id, VersionData FROM ContentVersion WHERE ContentDocumentId =:contentDocumentId ];
        System.debug('==========objContentVersion===========> '+ objContentVersion);
        List<String> lstRecords = objContentVersion.VersionData.toString().split( '\n' );
        System.debug('==========lstRecords===========> '+ lstRecords);
        SObjectType sObjectType = Schema.getGlobalDescribe().get(customSettingName);
        Map<String, Schema.SObjectField> fieldMap = sObjectType.getDescribe().fields.getMap();
        Map<String, SOAPType> fieldAPINameVsSOAPTypeMap = new Map<String, SOAPType>();
        for (String fieldAPIName : fieldMap.keySet()) {
            fieldAPINameVsSOAPTypeMap.put(fieldAPIName, fieldMap.get(fieldAPIName).getDescribe().getSOAPType());
        }

        Map<Integer,String> columnIndexVsFieldAPIName = new Map<Integer,String>();
        List<String> lstHeaders = lstRecords[0].split(',');
        for(Integer i = 0; i < lstHeaders.size() ; i ++){
            if(!String.isBlank(lstHeaders[i])){
                columnIndexVsFieldAPIName.put(i, lstHeaders[i].trim());
            }
        }

        for(Integer i = 1; i < lstRecords.size() ; i ++){
            List<String> lstCsvData = lstRecords[i].split(',');
            Sobject sObj = sObjectType.newSObject();

            for(Integer j = 0; j < lstCsvData.size() ; j ++){
                String fieldValue = !String.isBlank(lstCsvData[j]) ? lstCsvData[j].trim() : null; 
                System.debug(columnIndexVsFieldAPIName.get(j)+'========'+fieldValue);
                try{
                    if(!String.isBlank(fieldValue) && !'undefined'.equalsIgnoreCase(fieldValue)){
                        sObj.put(columnIndexVsFieldAPIName.get(j) , getFieldValueAsObject(fieldAPINameVsSOAPTypeMap, columnIndexVsFieldAPIName.get(j), fieldValue) );
                    }else{
                        sObj.put( columnIndexVsFieldAPIName.get(j) , null);
                    }
                }catch(Exception e){
                    System.debug('error---'+columnIndexVsFieldAPIName.get(j));
                }
                
            }
            System.debug('====='+sObj);
            lstSObjectToInsert.add(sObj);
        }

        Database.SaveResult[] srList = Database.insert(lstSObjectToInsert, false);
        for(Integer i = 0; i < srList.size(); i++){
            if(!srList[i].isSuccess()){
                ResultWrapper resultWrapper = new ResultWrapper();
                resultWrapper.fileName = customSettingName;
                resultWrapper.recordName = String.valueOf(lstSObjectToInsert[i].get('name'));
                resultWrapper.errorMessage = srList[i].getErrors()[0].getMessage();
                lstResultWrapper.add(resultWrapper);
            }
        }

        return lstResultWrapper;
    }

    public static Object getFieldValueAsObject(Map<String, SOAPType> fieldAPINameVsSOAPTypeMap, String fieldAPIName, String fieldValue) {
        System.debug('========'+fieldAPINameVsSOAPTypeMap.get(fieldAPIName));
        if (fieldAPINameVsSOAPTypeMap.get(fieldAPIName) == SOAPType.String) {
            return fieldValue;
        }
        else if (fieldAPINameVsSOAPTypeMap.get(fieldAPIName) == SOAPType.Date) {
            return Date.valueOf(fieldValue);
        }
        else if (fieldAPINameVsSOAPTypeMap.get(fieldAPIName) == SOAPType.Double) {
            return Double.valueOf(fieldValue);
        }
        else if (fieldAPINameVsSOAPTypeMap.get(fieldAPIName) == SOAPType.Boolean) {
            return Boolean.valueOf(fieldValue);
        }
        else if (fieldAPINameVsSOAPTypeMap.get(fieldAPIName) == SOAPType.DateTime) {
            return DateTime.valueOf(fieldValue);
        }
        else if (fieldAPINameVsSOAPTypeMap.get(fieldAPIName) == SOAPType.Integer) {
            return Integer.valueOf(fieldValue);
        }
        else {
            // other data type
            return fieldValue;
        }
    }
    //======================================Import End==============================================

    public class ResultWrapper{
        @AuraEnabled public String fileName {get;set;}
        @AuraEnabled public String recordName {get;set;}
        @AuraEnabled public String errorMessage {get;set;}
    }
}