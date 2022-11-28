export function exportCSVFile(headers, totalData, fileTitle){
    if(!totalData || !totalData.length){
        return null
    }
    const jsonObject = JSON.stringify(totalData)
    const result = convertToCSV(jsonObject,headers)
    if(result === null) return
    const blob = new Blob([result])
    const exportedFileName = fileTitle ? fileTitle+'.csv' : 'export.csv'

    const link = document.createElement("a")
    if(link.download !== undefined){
        const url = URL.createObjectURL(blob)
        link.setAttribute("href",url)
        link.setAttribute("download", exportedFileName)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

}

function convertToCSV(objArray, headers){
    const columnDelimiter = ','
    const lineDelimiter = '\r\n'
    const quote = "\"";
    const actualHeaderKey = Object.keys(headers)
    const headerToShow = Object.values(headers)
    let csvString = ''
    csvString += actualHeaderKey.join(columnDelimiter)
    csvString += lineDelimiter
    const data = typeof objArray !=='object' ? JSON.parse(objArray):objArray

    data.forEach(obj=>{
        let line = ''
        actualHeaderKey.forEach(key=>{
            if(line !=''){
                line+=columnDelimiter
            }
            key = key.toLowerCase();
            let columnValue = obj[ Object.keys(obj).find(objKey => objKey.toLowerCase() === key) ];
            line += columnValue && typeof columnValue === 'string' && columnValue.includes(",") ? quote + columnValue + quote : columnValue;
        })
        csvString += line + lineDelimiter
    })
    return csvString
}