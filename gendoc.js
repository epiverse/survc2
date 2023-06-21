
gendoc={ 'lines': [], 'targets': [], 'properties': [], 'objects': [], 'propertyDetails': []}

gendoc.getLines= async (url) =>{
    gendoc.url = url

    let r = await fetch(url);
    var t = await r.text()
    t=t.split('\n')
    gendoc.lines=t
    
    return t
}

gendoc.getObjects = () => {
    var props=[]
    var attrs=[]
    var obj=''
    var init=false
    var i=0
    gendoc.lines.forEach( l => {
        if( (l.indexOf('@object') > l.indexOf('*')) && (l.indexOf('*') != -1) ){
            var part = l.split('@object ')[1]
            obj=part
            init=true
        }
        
        if( (init && l.indexOf('@attribute') > l.indexOf('*')) && (l.indexOf('*') != -1) ){
            var part = l.split('@attribute ')[1]
            var temp = part.split(' ')
            var type = temp[0].replace('{','').replace('}','')
            var name = temp[1]
            var description = temp.slice(2).join(' ')
            var linkDoc = '#'+name
            attrs.push( { 'type': type, 'name': name, 'description': description } )
            
            if(gendoc.lines[i+1].indexOf('*/')!=-1){
                init=false
                props.push( {'name': obj, 'attributes': attrs} )
                attrs=[]
            }
        }
        
        i+=1
    })
    
    gendoc.objects = props
}

gendoc.buildTableObjects = () => {
    if(gendoc.objects.length==0){
        gendoc.getObjects()
    }
    
    var table = '';
    if(gendoc.objects.length>0){
        var linesTable="";
        gendoc.objects.forEach( p => {
            var attrs = p.attributes
            attrs.forEach( a => {
                var cols='';
                var keys = Object.keys(a)
                keys.forEach( k => {
                    cols+=`<td class='${k}'> ${a[k]} </td>`
                })
                linesTable+=` <tr> ${cols} </tr> `
            })
            
            table += `
                <div class="mt-3">
                    <h4> ${p.name}</h4>
                    
                    <div class="col-3 details-title">
                        Attributes:
                    </div>
                    
                    <div class="col-12 content-internal">
                        <table class="objectAttrList">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Name</th>
                                    <th>Description</th>
                                </tr>
                            </thead>

                            <tbody>
                                ${linesTable}
                            </tbody>
                        </table>
                   </div>
                </div>
            `
        })
        
    }
    
    return table
}

gendoc.getProperties = () => {
    var props=[]
    var targets=[]
    var namespace=''
    gendoc.lines.forEach( l => {
        if( (l.indexOf('@namespace') > l.indexOf('*')) && (l.indexOf('*') != -1) ){
            var part = l.split('@namespace ')[1]
            namespace=part
        }
        
        if( (l.indexOf('@property') > l.indexOf('*')) && (l.indexOf('*') != -1) ){
            var part = l.split('@property ')[1]
            var temp = part.split(' ')
            var type = temp[0].replace('{','').replace('}','')
            var name = temp[1]
            if(namespace!=''){
                name = namespace+'.'+name
            }
            targets.push(name)
            var linkDoc = '#'+name
            
            props.push( { 'type': type, 'name': name, 'description': linkDoc } )
        }
    })
    
    gendoc.properties = props
    gendoc.targets = targets
}

gendoc.buildTableProperties = () => {
    if(gendoc.properties.length==0){
        gendoc.getProperties()
    }
    
    var table = '';
    if(gendoc.properties.length>0){
        var linesTable="";
        gendoc.properties.forEach( p => {
            var cols='';
            var keys = Object.keys(p)
            keys.forEach( k => {
                if(k!='description'){
                    cols+=`<td class='${k}'> ${p[k]} </td>`
                }
                else{
                    cols+=`<td class='${k}'> <a href="#${p.name}" >${p[k]}</a> </td>`
                }
            })
            
            linesTable+=` <tr> ${cols} </tr> `
        })
        
        table = `
            <div class="mt-3">
                <h4> List of Methods</h4>
                
                <div class="col-12 content-internal">
                    <table class="propertyList">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Name</th>
                                <th>Description</th>
                            </tr>
                        </thead>

                        <tbody>
                            ${linesTable}
                        </tbody>
                    </table>   
               </div>
           </div>
        `
    }
    
    return table
}

gendoc.getDetails = (remote_host) => {
    var props=[]
    var init=false
    var initExample=false
    
    var examples=[]
    var params=[]
    var param_names=[]
    var return_ = {}
    var i=0
    gendoc.lines.forEach( l => {
        if( (l.indexOf('/**') != -1) ){
            var part = l.split('@object ')[1]
            obj=part
            init=true
        }
        
        if( (init && l.indexOf('@param') > l.indexOf('*')) && (l.indexOf('*') != -1) ){
            var part = l.split('@param ')[1]
            var temp = part.split(' ')
            var type = temp[0].replace('{','').replace('}','').replace('|',' or ')
            var name = temp[1].replace('[','').replace(']','')
            var default_=''
            if(name.indexOf('=') != -1 ){
                var cks=name.split('=')
                name=cks[0]
                default_=cks[1]
            }
            param_names.push(name)
            var description = temp.slice(2).join(' ')
            
            params.push( { 'type': type, 'name': name, 'default': default_, 'description': description } )
        }
        
        if( (init && l.indexOf('@returns') > l.indexOf('*')) && (l.indexOf('*') != -1) ){
            var part = l.split('@returns ')[1]
            var temp = part.split(' ')
            var type = temp[0].replace('{','').replace('}','')
            var description = temp.slice(1).join(' ')
            return_ = { 'type': type, 'description': description }
        }
        
        if( initExample && (l.indexOf('*') != -1) ){
            var ex = l.split('* ')
            if(ex.length>1){
                if(ex[1]!=''){
                    ex=ex[1]
                    examples.push(ex)
                }
            }
        }
        
        if( (init && l.indexOf('@example') > l.indexOf('*')) && (l.indexOf('*') != -1) ){
            initExample=true
        }
        
        if( init && (l.indexOf('*/') != -1) ){
            initExample=false
            var part = gendoc.lines[i+1].split('=')[0].replace(' ','')
            var line = gendoc.lines.indexOf(gendoc.lines.filter(x=> x.indexOf(part)==0)[0])+1
            var linkCode = remote_host+'#L'+line
            
            if( gendoc.targets.includes(part)){
                props.push( { 'name': part, 'param_names': param_names, 'params': params, 'return_': return_, 'examples': examples, 'linkCode': linkCode } )
            }
            examples=[]
            params=[]
            param_names=[]
            return_ = {}
            
            init=false
        }
        
        i+=1
    })
    
    gendoc.propertyDetails = props
}

gendoc.buildTableParams = (params) => {
    var table = '';
    if(params.length>0){
        var linesTable="";
        params.forEach( p => {
            var cols='';
            var keys = Object.keys(p)
            keys.forEach( k => {
                cols+=`<td class='${k}'> ${p[k]} </td>`
            })
            
            linesTable+=` <tr> ${cols} </tr> `
        })
        
        table = `
            <div class="mt-2">
                <div class="col-3 details-title">
                    Parameters:
                </div>
                
                <div class="col-12 content-internal">
                    <table class="paramsList">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Name</th>
                                <th>Default</th>
                                <th>Description</th>
                            </tr>
                        </thead>

                        <tbody>
                            ${linesTable}
                        </tbody>
                    </table> 
                </div>
            </div>  
        `
    }
    
    return table
}

gendoc.buildExamples = (examples) => {
    var table = '';
    if(examples.length>0){
        var linesTable=examples.join(' <br />');
        
        table = `
            <div class="mt-3">
                <div class="col-2 details-title">
                    Examples:
                </div>
                
                <div class="col-12 content-internal">
                    <code>
                        <div class="codeExample">
                            ${linesTable}
                        </div>   
                    </code>
                </div>
            </div>
        `
    }
    
    return table
}

gendoc.buildReturn = (return_) => {
    var table = '';
    if(Object.keys(return_).length>0){
        
        table = `
            <div class="mt-2">
                <div class="col-3 details-title">
                    Return:
                </div>
                
                <div class="col-12 content-internal">
                    (${return_.type}) - <b>${return_.description}</b>
                </div>
            </div>
        `
    }
    
    return table
}

gendoc.buildLinkSource = (linkCode) => {
    var ulp=linkCode.split("/")

    var table = '';
    table = `
        <div class="mt-2">
            <div class="col-3 details-title">
                Source location:
            </div>
            
            <div class="col-12 content-internal">
                <a href="${linkCode}" target="_blank"> ${ulp[ulp.length-1].split('#')[0]}, Line ${ulp[ulp.length-1].split('#')[1].replace('L','')} </a>
            </div>
        </div>
    `
    
    return table
}

gendoc.buildPropertyDetail = (remote_host) => {
    if(gendoc.propertyDetails.length==0){
        gendoc.getDetails(remote_host)
    }
        
    var table = '';
    if(gendoc.propertyDetails.length>0){
        gendoc.propertyDetails.forEach( p => {
            var method = p.name+`(${p.param_names.join(', ')})`
            var params = gendoc.buildTableParams(p.params)
            var return_ = gendoc.buildReturn(p.return_)
            var examples = gendoc.buildExamples(p.examples)
            var link = gendoc.buildLinkSource(p.linkCode)
            
            table += `
                <div class="col-12 area-properties mt-2" id="${p.name}" >
                    <h4 class="name-method"> ${method} </h3>
                    
                    ${params}
                    
                    ${return_}
                    
                    ${link}
                    
                    ${examples}
                </div>
            `
        })
    }
    
    return table
}

gendoc.buildDocumentation = (jsfile, container_id, remote_host) => {
    gendoc.getLines(jsfile).then( (value) => {
        var objects = gendoc.buildTableObjects()
        var methods = gendoc.buildTableProperties()
        var details = gendoc.buildPropertyDetail(remote_host)
        
        var html=`
            <h2>Documentation</h2>
        
            <div class="col-12" >
                <h3> Objects </h3>
                ${objects}
                
                <h3> Properties </h3>
                ${methods}
                
                <h3> Properties Details </h3>
                ${details}
            </div>
        `
        
        document.getElementById(container_id).innerHTML=html
    })
}


