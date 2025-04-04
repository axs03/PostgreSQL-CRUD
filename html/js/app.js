'use strict';

var PLAYER_QUERY_URL_PREFIX = 'http://localhost:3000/player?first_name=ilike.';

var app = {};

app.addResultRows = function (rows) {
    var rowsString = '';
    var rowsLength = rows.length;

    if (rowsLength > 0) {
        for (var i = 0; i < rowsLength; i++) {
            rowsString += app.buildResultRowString(rows[i]);
        }
    } else {
        rowsString = '<tr><td colspan="4">Results not found</td></tr>';
    }

    document.getElementById('results-table-body').innerHTML = rowsString;
    app.showElement('results-table');
}

app.buildResultRowString = function (row) {
    return  '<tr>' +
                '<td>' + row.first_name + '</td>' +
                '<td>' + row.last_name + '</td>' +
                '<td>' + row.age + '</td>' +
                '<td>' + row.team_id + '</td>' +
            '</tr>';
}

app.showElement = function (id) {
    document.getElementById(id).classList.remove('hidden');
}

app.queryPlayer = function (name) {
    // Construct the query URL with wildcards for filtering first_name field
    var queryURL = PLAYER_QUERY_URL_PREFIX + '*' + name + '*';
    
    fetch(queryURL)
        .then(function(response) {
            return response.json();
        })
        .then(function (data) {
            console.log(data);
            app.addResultRows(data);
        })
}

app.searchClick = function () {
    var name = document.getElementById('city-input').value;
    app.queryPlayer(name);
}