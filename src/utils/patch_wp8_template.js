var fs = require('fs'),
    wp8_template = 'cordova-wp8/wp8/template/MainPage.xaml.cs';

fs.readFile(wp8_template, 'utf8', function (err,data) {
    if (err) {
        return console.error(err);
    }
    var result = data.replace('InitializeComponent();', 'InitializeComponent();'+ '\n' +
        'Microsoft.Phone.Shell.PhoneApplicationService.Current.UserIdleDetectionMode = Microsoft.Phone.Shell.IdleDetectionMode.Disabled;');

    fs.writeFile(wp8_template, result, 'utf8', function (err) {
        if (err) return console.error(err);
    });
});