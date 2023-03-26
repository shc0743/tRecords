export const formatters = {
    tab(data) {
        return `${data.value.replaceAll('\t', '\\t')}\t${data.date}\t${data.time}\n`;
    },
    csv(data) {
        return `"${data.value.replaceAll('\"', '\\"')}","${data.date}","${data.time}"\r\n`;
    },
};
export const parsers = {
    tab(row, computeId) {
        const data = row.split('\t');
        const newData = {
            date: data[1],
            time: data[2],
            value: data[0].replaceAll('\\t', '\t'),
        };
        newData.id = computeId(newData);
        return newData;
    },
};
export const formatters_poster = {
    tab(data, editDfName) {
        editDfName('Export.txt');
        return data;
    },
    csv(data, editDfName) {
        editDfName('Export.csv');
        data.splice(0, 0, '\uFEFF');
        return data;
    },
};
