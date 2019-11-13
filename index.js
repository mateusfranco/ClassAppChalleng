const filesystem = require('fs');
const phoneUtil  = require('google-libphonenumber').PhoneNumberUtil.getInstance();

const INPUT      = './input.csv';

filesystem.readFile(INPUT, (err, data) => {
    
    if (err) throw err;

    let dataArray = data.toString().split('\n');
    const coluns  = dataArray[0].split(',');
    let students  = [];
    studentsRaw   = dataArray.slice(1, dataArray.length);

    studentsRaw.forEach(student => {
        student = String(student);
        students.push( student.split(',') );
    });
    
    let tagsMatrix = setupTags(coluns);

    let output = [];

    students.forEach( (student)  => {
        let studentPart          = organizeStudents(student);
        let addresses            = setupAddresses(tagsMatrix, student);
        studentPart["addresses"] = addresses;
        let ret                  = findRepeat(output, studentPart);
        let hasRepeat            = ret[0];
        let indexRepeat          = ret[1];
        if ( hasRepeat ) output[indexRepeat] = addRepeat(output[indexRepeat], studentPart);
        else{
            output.push( studentPart );
        }
    });
    generateOutput(output);
});


function organizeStudents(student){

    let fullname  = student[0];
    let eid       = student[1];
    let addresses = {};
    let invisible = (student.slice(-2)[0] == true ) ? true : false ;
    let see_all   = (student.slice(-1)[0] == 'yes') ? true : false ;

    let classes      = defineClasses(student[2]);
    let commaClasses = student.slice(3, -8);
    commaClasses.forEach((classElement)=>{
        classes = classes.concat( defineClasses(classElement) );
    });
    
    infoStudent = {
        'fullname' : fullname,
        'eid'      : eid,
        'classes'  : classes,
        'addresses': addresses,
        'invisible': invisible,
        'see_all'  : see_all
    };
    
    return infoStudent;
}

function defineClasses(classes){ 
    
    let classesList = classes.split(/[^\w \d]/);
    
    classesList     = classesList.filter( (classes) => {
        if (classes) return classes;
    });
    
    for (let index = 0; index < classesList.length; index++) {
        classesList[index] = classesList[index].trim();
    }

    return classesList;
}

function countLenElement(matriz){
    
    let cont=0;
    
    for (let index = 0; index < matriz.length; index++) {
        if (matriz[index].length > 2) cont++;
    }
    
    return cont;
}

function setupTags(coluns){
    
    let tags    = [];
    let allTags = [];
    
    for (let index = 0; index < coluns.length; index++) {
        
        let hasDoubleQuotes = coluns[index].includes('"');
        let column          = coluns[index].split(" ");
        
        if (column.length > 1 && !hasDoubleQuotes){ 
            allTags.push(column); 
        }
        
        if (hasDoubleQuotes) {
            tags.push(coluns[index]);
        }else if (tags) {
            allTags.push( analizeTag(tags) );
            tags        = [];
        }
        
    }
    allTags = allTags.filter((onlyFill)=>{
        return onlyFill.length;
    })

    let cont=0;

    for (let index = 0; index < countLenElement(allTags) ; index++) {
        let swap        = allTags[cont];
        allTags[cont]   = allTags[cont+1];
        allTags[cont+1] = swap;
        cont += 2;
    }

    return allTags;

}

function analizeTag(tags){

    let stringTag = "";
    
    tags.forEach(tag => {
        stringTag += " " + tag;
    });

    let analizedTag = stringTag.split(' ');

    for (let index = 0; index < analizedTag.length; index++) {
        analizedTag[index] = analizedTag[index].replace(/["]/,'');
    }

    let filteredTags = analizedTag.filter((tag) => {
        return tag != '';
    });

    return filteredTags;
}

function setupAddresses(tagsMatriz,student){

    let infoAddress = student.slice(-8,-2); //capure info of tags    
    infosAddress = addressesRepeat(infoAddress);
    
    let addresses   = [];

    for (let index = 0; index < tagsMatriz.length; index++) {
        let infosArray = infoAddress[index].split(/[/,]+/);
        if(infosArray.length > 1){
            infosArray.forEach((element) => {
                let address = analizeAddresses( tagsMatriz[index],element );
                if(address) addresses.push( address );
            });
        }else{
            let address = analizeAddresses( tagsMatriz[index],infoAddress[index] );
            if(address) addresses.push( address );  
        }  
    }
    return(addresses);
}

function validateEmail(email){
    let regex1 = /\S+@\S+\.\S+/;
    if (email.includes(" ")) return false;
    return regex1.test(email);
}

function analizeAddresses(tags, infos){
    let type = tags[0];
    tags = tags.slice(1,tags.length);
    let addr; 
    

    if (type == 'phone') {
        try{
            const phone  = phoneUtil.parseAndKeepRawInput(infos, 'BR');
            let possible = phoneUtil.isValidNumber(phone);
            if(!possible) return false;
            addr = String(phone.values_['1']) + String(phone.values_['2']);
        }catch{
            return false;
        }
    }else{// is email
        if( validateEmail(infos) ) addr = infos;
        else return false;
    }    
    address = {
        'type': type,
        'tags': tags,
        'address': addr
    }
    return address;
}

function findRepeat(students, student){
    
    let index = 0;
    let val   = [false, index];

    students.forEach( (element) => {
        if (element['eid'] == student['eid']){
            val = [true, index];
            return;
        }
        index++;
    });
    return val;

}

function addRepeat(student, repeat){
    student['classes']   = student['classes'].concat(repeat['classes']);
    
    student['addresses'] = student['addresses'].concat(repeat['addresses']);    

    if(student['invisible'] == '') student['invisible'] = repeat['invisible'];
    if(student['see_all']   == '') student['see_all']   = repeat['see_all'];

    return student;
}

function addressesRepeat(infosAddress){
    for (let i = 0; i < infosAddress.length-1; i++) {
        for (let j = i+1; j < infosAddress.length; j++) {
            if(infosAddress[i] == infosAddress[j]){
                infosAddress[j]='';
            }
        }
    }
    return infosAddress;
}

function generateOutput(data){
    filesystem.writeFile("output.json", JSON.stringify(data), function(err) {
        if (err) {
            console.log(err);
        }
    });
}

