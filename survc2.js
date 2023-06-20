console.log('SurvC2 loaded')

/*  Axiliary functions for waiting next call (sleep), parse iterators (runIteratorUntilDone) and statistical/math computation shorcuts (min, max, mean, sum) */

const sleep = ms => new Promise(r => setTimeout(r, ms));
const sum = (arr) => arr.reduce( (a,b) => a+b )
const max = (arr) => arr.reduce( (a,b) => { if(a > b) { return a; } else{ return b } } )
const min = (arr) => arr.reduce( (a,b) => { if(a < b) { return a; } else{ return b } } )
const mean = (arr) => sum(arr)/arr.length
const runIteratorUntilDone = (iterator) => { var result; do { result = iterator.next(); } while (!result.done); return result.value; }

/**
 * Main global portable module.
 * @namespace 
 * @property {Function} SurvC2Init - {@link SurvC2Init}
 *
 * @namespace survc2
 * @property {Function} getValidatedData - {@link survc2.getValidatedData}
 * @property {Function} init_nlp - {@link survc2.init_nlp}
 * @property {Function} get_section_slice - {@link survc2.get_section_slice}
 * @property {Function} get_header_sections - {@link survc2.get_header_sections}
 * @property {Function} loadMonograph - {@link survc2.loadMonograph}
 * @property {Function} remove_breaks - {@link survc2.remove_breaks}
 * @property {Function} remove_number_short_sentences - {@link survc2.remove_number_short_sentences}
 * @property {Function} calculate_sim - {@link survc2.calculate_sim}
 * @property {Function} filter_context_sections - {@link survc2.filter_context_sections}
 * @property {Function} filter_context_sentences - {@link survc2.filter_context_sentences}
 * @property {Function} correct_sentence_grammar - {@link survc2.correct_sentence_grammar}
 * @property {Function} process_agent_gpt_result - {@link survc2.process_agent_gpt_result}
 * @property {Function} correct_agents_from_gpt - {@link survc2.correct_agents_from_gpt}
 * @property {Function} get_agents_from_nlp - {@link survc2.get_agents_from_nlp}
 * @property {Function} get_agents_from_gpt - {@link survc2.get_agents_from_gpt}
 * @property {Function} get_bert_answers - {@link survc2.get_bert_answers}
 * @property {Function} completions - {@link survc2.completions}
 * @property {Function} get_gpt_answers - {@link survc2.get_gpt_answers}
 * @property {Function} _prepTask - {@link survc2._prepTask}
 * @property {Function} get_wink_answers - {@link survc2.get_wink_answers}
 * @property {Function} loadScrapedMonographs - {@link survc2.loadScrapedMonographs}
 * @property {Function} getExtractLines - {@link survc2.getExtractLines}
 * @property {Function} processMonographLinkHtml - {@link survc2.processMonographLinkHtml}
 * @property {Function} getBookLinks - {@link survc2.getBookLinks}
 * @property {Function} scrapSourceMonoGraphLinks - {@link survc2.scrapSourceMonoGraphLinks}
 */


 /**
 *
 *
 * @object SurvC2Init
 * @attribute {Module} gpt Library for open ai api key management.
 * @attribute {array} monographs List of iarc monographs with information of volume, yea and pdf download links scraped from the iarc web pages.
 * @attribute {Object} validated Object containing the names of the known agents in the knowledge base with the respective mapped pdf link for the whole document
 */

/** 
* Initializes the IARC Library object
* 
*
*
* @returns {Object} IARC library object for nlp and chat gpt functions. .
* 
* @example
* let v = await SurvC2Init()
*/
var SurvC2Init = async function (key=''){
    localStorage.GPT_API_key = key
    
    var obj = {'monographs': []}
    var info = await Promise.all( [ import('https://episphere.github.io/gpt/jonas/export.js'), survc2.loadScrapedMonographs(), survc2.getValidatedData(obj), survc2.init_nlp() ] )
    obj.gpt = info[0]
    obj.monographs = info[1]
    obj.validated = info[2]
    
    return obj
}

/* Object initialization and gpt configuration */

let survc2 = { mod_nlp: null }

/** 
* Get mapping between substances and link for monograph in pdf
* 
*
* @param {Object} obj SurvC2 library object
*
* @returns {Object} Object mapping the name of the agents discussed by iarc with their respective pdf link for the entire monograph
* 
* @example
* let obj = await SurvC2Init()
* let dat = await survc2.getValidatedData(obj)
*/
survc2.getValidatedData = async function (obj){
    if(obj.monographs.length==0){
        obj.monographs = await survc2.loadScrapedMonographs()
    }
    
    if(typeof(d3)=="undefined"){
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.4/d3.min.js')
    }
    
    var rows = await d3.csv('https://raw.githubusercontent.com/filhoalm/monoapp1/main/data2102023c.csv')
    var data = {}
    rows.forEach( el => {
        var year = el.year
        var volume = el.volume
        var agent = el.agent_subtype
        console.log(volume, year)
        var link_pdf = obj.monographs.filter(e => (e.year==el.year && e.volume==el.volume) )
        if(link_pdf.length > 0){
            link_pdf = link_pdf[0].link_pdf
            data[agent] = link_pdf
        }
    })
    
    var agents = Object.keys(data)
    
    return data
}

/* ------------- NLP functions ------------- */

/** 
* Load natural language processing (NLP) libraries and bert LLM model
* 
*
*
* @returns {Object} Object file containing the statistics filtered by the input cause and organized according to the chosen dimension.
* 
* @example
* await survc2.init_nlp()
*/
survc2.init_nlp = async () => {
    // Wink traditional nlp
    if(survc2.mod_nlp==null){
        survc2.mod_nlp={}
        survc2.mod_nlp['winkNLP'] = (await import('https://cdn.skypack.dev/wink-nlp')).default;
        survc2.mod_nlp['model'] = (await import('https://cdn.skypack.dev/wink-eng-lite-web-model')).default;
        survc2.mod_nlp['bm25Vectorizer'] = (await import('https://cdn.skypack.dev/wink-nlp/utilities/bm25-vectorizer')).default
        survc2.mod_nlp['sim'] = (await import('https://cdn.skypack.dev/wink-nlp/utilities/similarity')).default
        survc2.mod_nlp['nlp'] = survc2.mod_nlp.winkNLP( survc2.mod_nlp.model );
        survc2.mod_nlp['its'] = survc2.mod_nlp.nlp.its
        
        survc2.mod_nlp['DependencyParser'] = (await import('https://cdn.jsdelivr.net/npm/dependency-parser@1.0.4/+esm')).default
        
        // Wink search engine
        survc2.mod_nlp['bm25']  = (await import('https://cdn.skypack.dev/wink-bm25-text-search')).default;
        
        // Bert tfjs
        survc2.mod_nlp['bertModel'] = await qna.load()
    }
    
    console.log('survc2 nlp module loaded')
    
}

/** 
* Retrieve pdf file, parse and organize its content
* 
*
* @param {string} link Link to the PDF file
*
* @returns {array} Array of objects containing the raw text (content property), page number (page) and table of contents flag (note_mark)
* 
* @example
* let v = await survc2.loadMonograph('https://publications.survc2.fr/_publications/media/download/5409/5f12a3cfc6a2291b8dca418b2d322642ccb8f0fc.pdf')
*/
survc2.loadMonograph = async function(link){
    link = 'https://corsproxy.io/?' + encodeURIComponent(link)
    
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.5.141/pdf.worker.min.js';
    
    link = link
    var answer = []
    var loadingTask = pdfjsLib.getDocument(link);
    return loadingTask.promise.then( async function(pdf) {
        var numPages = pdf.numPages
        var pgs= []
        for( var i=1; i<=numPages; i++){
            pgs.push(i)
        }
        var answer = await Promise.all( pgs.map( async i => {    
            var page = await pdf.getPage(i)
            var content = await page.getTextContent()
            var items = content.items;
            var text=''
            var note = false
            items.forEach(e => { 
                text+=e.str+'\n' 
                var aux = text.toLowerCase().replaceAll(' ','').replaceAll('\n','')
                //if( e.str.toLowerCase().replaceAll(' ','').indexOf('note')!=-1 && e.str.toLowerCase().replaceAll(' ','').indexOf('reader')!=-1 && (e.str.toLowerCase().replace(' ', '').indexOf('reader') - e.str.toLowerCase().replace(' ', '').indexOf('note') ) < 20 ){
                if( aux.indexOf('note')!=-1 && aux.indexOf('reader')!=-1 && ( aux.indexOf('reader') - aux.indexOf('note') ) < 20 ){
                    note=true
                }
            })
            
            var key = `page_${i}`
            
            var ans = {}
            ans['content'] = text
            ans['page'] = i
            ans['note_mark'] = note
            
            return ans
        }))
        
        return answer
    })
}

/** 
* Get treated text parsed from monograph pdf with the pages content organized by each section found in the table of contents
* 
*
* @param {array} content Array containing objects containing the properties of each page read from monograph (page: number of the page, content: raw text as parsed from pdf and note_mark: boolean flag indicating the table contents delimiter)
*
* @returns {array} Array of section objects containing the the properties: name - section name; page_start: initial page; page_end: final page and content: list of treated sentences
* 
* @example
* let content = await survc2.loadMonograph('https://publications.survc2.fr/_publications/media/download/5409/5f12a3cfc6a2291b8dca418b2d322642ccb8f0fc.pdf')
* let v = await survc2.get_header_sections(content)
*/
survc2.get_header_sections_ = (content) => {
    var info_sections = []
    var lc = content.filter( s => s.note_mark )
    if(lc.length >= 2){
        var start = lc[0].page
        var end = lc[1].page
        var add = end-1
        
        var flag = true
        var previous = -1        
        for(var k=start; k<end; k++){
            var temp = content.filter( c => c.page==k )[0]
            if(temp!=undefined){
                console.log('processing page ', k)
                var i=0
                var els = temp.content.split('\n')
                //console.log(els)
                var st = ''
                for(var el of els ){
                    if(el.indexOf('. . . . . .')!=-1){
                        var page = (! isNaN( parseInt(els[i+1]) ) && els[i+1]!='' && els[i+1]!=' ' ) ? parseInt(els[i+1]) : parseInt(els[i+2])
                        st = ( isNaN( parseInt(els[i-1]) ) && els[i-1]!='' && els[i-1]!=' ' ) ? els[i-1] : els[i-2]
                        if(previous!=-1 && flag){
                            info_sections[ info_sections.length-1 ].content = survc2.get_section_slice(content, previous+add, page+add)
                            info_sections[ info_sections.length-1 ].page_end = page
                        }
                        
                        if(flag){
                            info_sections.push( { 'name': st, 'page_start': page } )
                        }
                        
                        if( ( st.indexOf('glossary')!=-1 || st.indexOf('appendix')!=-1 || st.indexOf('annex')!=-1 || st.replaceAll(' ', '').indexOf('listof')!=-1 || st.replaceAll(' ', '').indexOf('breviation')!=-1 ) ){
                            flag=false
                        }
                        
                        previous=page
                    }
                    
                    st=el.toLowerCase().replaceAll(' ','')
                    if( previous!=-1 && ( st.indexOf('glossary')!=-1 || st.indexOf('appendix')!=-1 || st.indexOf('annex')!=-1 || st.replaceAll(' ', '').indexOf('listof')!=-1 || st.replaceAll(' ', '').indexOf('breviation')!=-1 ) ){
                        flag=false
                        if( info_sections[ info_sections.length-1 ].page_end==undefined ){
                            var page = (! isNaN( parseInt(els[i+1]) ) && els[i+1]!='' && els[i+1]!=' ' ) ? parseInt(els[i+1]) : parseInt(els[i+2])
                            
                            info_sections[ info_sections.length-1 ].content = survc2.get_section_slice(content, previous+add, page+add)
                            info_sections[ info_sections.length-1 ].page_end = page
                        }
                    }
                    
                    i+=1
                }
            }
        }
    }
    
    return info_sections
}

survc2.get_header_sections = (content) => {
    var info_sections = []
    var lc = content.filter( s => s.note_mark )
    if(lc.length >= 2){
        var start = lc[0].page
        var end = lc[1].page
        var add = end-1
        
        var flag = false
        var previous = -1        
        for(var k=start; k<end; k++){
            var temp = content.filter( c => c.page==k )[0]
            if(temp!=undefined){
                console.log('processing page ', k)
                var i=0
                    
                var lst = temp.content.split('\n\n')
                //console.log(lst)
                if( lst.length < 5 && k!=end-1){
                    var aux = temp.content.split('\n')
                    var lsta=[]
                    var iter=[]
                    var ki = 0
                    //for(var el of aux){
                    while(ki < aux.length){
                        el=aux[ki]
                        
                        iter.push(el)
                        flag=true
                        if( el.indexOf('. . . . .') != -1 || el.indexOf('.....') != -1 ){
                            var temppg = el.split('.').slice(-1)[0]
                            if( isNaN(Number(temppg)) || temppg=='' || temppg==' ' ){
                                var jj = ki
                                while( (isNaN(Number(temppg)) || temppg=='' || temppg==' ') && ki < aux.length ){
                                    jj+=1
                                    temppg = aux[jj]
                                }
                                
                                if(jj < aux.length-1){
                                    iter.push(temppg)
                                    ki=jj
                                }
                                else{
                                    flag=false
                                }
                            }
                            
                            if(flag){
                                lsta.push(iter.join('\n'))
                            }
                            
                            iter=[]
                        }
                        ki+=1
                    }
                    lst=lsta
                    //console.log(lst)
                }
                var els = lst.map( s => s.replaceAll('\n','.').split('.').filter(e => e!='' && e!=' ' ) ).filter(e => e.length > 1)
                //var els = temp.content.split('\n\n').map( s => s.split('\n').filter(e => e!='' && e!=' ' && e.indexOf('. . . .')==-1 ) ).filter(e => e.length > 2)
                //console.log(els)
                var st = ''
                for(var el of els ){
                    var sec = []
                    var fn = 0
                    for (var iel of el){
                         if( isNaN( Number(iel) ) ){
                            sec.push(iel)
                         }
                         else{
                            if(fn==0){
                                fn = Number(iel)
                            } 
                         }
                    }
                    var aux = sec.join(' ')
                    var sta = aux.toLowerCase()
                    
                    var page = Number( el.slice(-1)[0].replaceAll(' ','') )
                    //console.log(sta, page, !isNaN( page ))
                    if( sta.indexOf('note')!=-1 && sta.indexOf('reader')!=-1 ){
                        if(page!=1){
                            add=0
                        }
                    }
                    
                    if( !isNaN( page ) && sta.indexOf('note')==-1 && sta.indexOf('reader')==-1 && sta.indexOf('iarc monographs')==-1 ){
                        
                        if(previous!=-1 && flag){
                            info_sections[ info_sections.length-1 ].content = survc2.get_section_slice(content, previous+add, page+add)
                            info_sections[ info_sections.length-1 ].page_end = page
                        }
                       // console.log(add, aux, flag)
                        st = sta.replaceAll(' ', '')
                        if( ( st.indexOf('glossary')!=-1 || st.indexOf('appendix')!=-1 || st.indexOf('annex')!=-1 || (st.indexOf('cumulative')!=-1 && st.indexOf('index')!=-1) || st.indexOf('listof')!=-1 || st.indexOf('breviation')!=-1 ) ){
                            //console.log('-----------', page)
                            flag=false
                            if( info_sections[ info_sections.length-1 ] != undefined){
                                info_sections[ info_sections.length-1 ].content = survc2.get_section_slice(content, previous+add, page+add)
                                info_sections[ info_sections.length-1 ].page_end = fn
                            }
                        }
                        
                        if(flag){
                            info_sections.push( { 'name': aux, 'page_start': page } )
                            previous = page
                        }
                        
                    }
                    
                    if( previous==-1 && !isNaN( page ) && ( sta.indexOf('preamble')!=-1 || sta.indexOf('reader')!=-1 || sta.indexOf('background')!=-1 ) ){
                        flag=true
                    }
                    
                    i+=1
                }
            }
        }
    }
    
    return info_sections
}

/** 
* Get and treat the content of a range of monograph pages 
* 
*
* @param {array} content Array containing objects containing the properties of each page read from monograph (page: number of the page, content: raw text as parsed from pdf and note_mark: boolean flag indicating the table contents delimiter)
* @param {number} start Start page
* @param {number} end End page
*
* @returns {array} list of sentences extracted using ".", prunned using 30 characters as minimum length and cleaned to remove excessive line and word breaks
* 
* @example
* let content = await survc2.loadMonograph('https://publications.survc2.fr/_publications/media/download/5409/5f12a3cfc6a2291b8dca418b2d322642ccb8f0fc.pdf')
* let v = await survc2.get_section_slice(content, 10, 15)
*/
survc2.get_section_slice = (content, start, end) => {
    var text=''
    for(var i=start; i<end+1; i++){
        var temp = content.filter( c => c.page==i )[0]
        text+=temp.content+"\n"
    }
    text = text.split('.').filter(e => e.length >= 30 && e.toLowerCase().indexOf('iarc')==-1 && e.toLowerCase().indexOf('monographs')==-1 ).map(e => survc2.remove_breaks(e))
    return text
}

/** 
* Remove line breaks and treat word breaks
* 
*
* @param {string} temp Sentence
*
* @returns {string} Treated sentence
* 
* @example
* let v = await survc2.remove_breaks('239\n\n6.1\n \nCancer in humans\n\nThere is\n \nsufficient evidence\n \nin humans for the\n\ncarcinogenicity of opium consumption. Opium\n\nconsumption\n \ncauses\n \ncancers\n \nof\n \nthe\n \nurinary\n\nbladder, larynx, and lung.')
*/
survc2.remove_breaks = (temp) => {
    temp=temp.replaceAll('\n-\n\n','')
    while( temp.indexOf('\n') != -1 ){
            
            var ind=temp.indexOf('\n')
            if(temp[ind-1]=='-'){
                temp=temp.replace('-\n','')
            }
            else{
                if(temp[ind-1]!=' ' && temp[ind+1]!=' '){
                    temp=temp.replace('\n',' ')
                }
                else{
                    temp=temp.replace('\n','')
                }
            }
        }
    return temp
}

/** 
* Treat a list of sentences, removing numbers, treating line and word breaks and prunning sentences that have a required minimum of words
* 
*
* @param {array} sentences List of sentences
* @param {number} [min_words=3] Minimum number of words required in the sentence
*
* @returns {array} List of treated sentences
* 
* @example
* let v = await survc2.remove_number_short_sentences( ['1 Cancer in humans\n There is sufficient evidence in humans for the carcinogenicity of opium consumption', '2 Cancer in experimental animals\n There is inadequate evidence in experimental animals regarding the carcinogenicity of opium'], 5 )
*/
survc2.remove_number_short_sentences = (sentences, min_words=3) => {
    var result = []
    sentences.forEach( temp => {
        if(temp.indexOf('\n')!=-1){
            temp = survc2.remove_breaks(temp)
        }
        var new_sentence = temp.split(' ').filter( s => isNaN( Number(s) ) )
        
        if(new_sentence.length >= min_words){
            result.push( new_sentence.join(' ') )
        }
    })
    
    return result
}

/** 
* Calculate similarity between two sentences
* 
*
* @param {string} type Similarity metric (options: cosne, tversky and oo)
* @param {string} question Question
* @param {string} sentence Sentence
*
* @returns {number} Smilarity value ranging from 0 to 1
* 
* @example
* let v = await survc2.calculate_sim('tversky', 'Is there evidence for the carcinogenicity of opium consumption?', 'Opium consumption causes cancers of the urinary bladder, larynx, and lung')
*/
survc2.calculate_sim = (type, question, sentence) => {
    question = question.toLowerCase()
    sentence = sentence.toLowerCase()
    
    var sim_types = ['cosine', 'tversky', 'oo']
    type = ( sim_types.includes(type) ) ? type : 'cosine'
    
    if( sim_types.includes(type) ){
        var docq = survc2.mod_nlp.nlp.readDoc(question);
        var docs = survc2.mod_nlp.nlp.readDoc(sentence);
    
        var fam = (type=='cosine') ? 'bow' : 'set'
        var featuresq = docq.tokens().out( survc2.mod_nlp.its.value, survc2.mod_nlp.nlp.as[fam] )
        var featuress = docs.tokens().out( survc2.mod_nlp.its.value, survc2.mod_nlp.nlp.as[fam] )
        
        //return { 'sentence': sentence, 'score': survc2.mod_nlp.sim[fam][type](featuresq, featuress) }
        return  survc2.mod_nlp.sim[fam][type](featuresq, featuress)
    }
    else{
        console.log('Error: This similarity metric is not available')
        //return  { 'sentence': sentence, 'score': -1 }
        return -1
    }
}

/** 
* Given a question, it ranks the sentences found on each section of the monograph according to the similarity score with the question
* 
*
* @param {string} q Question
* @param {array} sections Array of section objects containing the the properties: name - section name; page_start: initial page; page_end: final page and content: list of treated sentences
* @param {string} st Similarity metric (options: cosne, tversky and oo)
*
* @returns {Object} Object containing the ranked sentences (bySentence property) with their similarity scores according to the question with two options of ranking: list of sentences ranked among all sections and the partial ranked list in each section. The overall anf bySection modes also contains the summary statistics of scores (max, min and mean)
* 
* @example
* let content = await survc2.loadMonograph('https://publications.survc2.fr/_publications/media/download/5409/5f12a3cfc6a2291b8dca418b2d322642ccb8f0fc.pdf')
* let sections = await survc2.get_header_sections(content)
* let v = await survc2.filter_context_sections('Is there evidence for the carcinogenicity of opium consumption?', sections, 'tversky')
*/
survc2.filter_context_sections = (q, sections, st) => {
    var sim_types = ['cosine', 'tversky', 'oo']
    st = ( sim_types.includes(st) ) ? st : 'cosine'
     
    // Measure similarity by section
    // Choose the section containing the highest scores
    
    var metrics = {'bySection': {}, 'overall': [] }
    var all=[]
    for (var section of sections){
        var k = section.name
        var sentences = section.content
        sentences = survc2.remove_number_short_sentences(sentences, 3)
        sentences = sentences.map( s => { return s.toLowerCase() } )
        q = q.toLowerCase()
        var x = sentences.map( s => { return { 'section': k, 'sentence': s, 'similarity': survc2.calculate_sim(st, q, s) } } )
        all = all.concat(x)
        
        metrics['bySection'][k]={}
        
        if( x.length > 0 ){
            var scores = x.map(e => e['similarity'])
            for (f of ['max','min','mean']){
                metrics['bySection'][k][f] = eval(`${f}(scores)`)
            }
        }
        else{
            for (f of ['max','min','mean']){
                metrics['bySection'][k][f] = -1
            }
        }
        
        metrics['bySection'][k]['bySentence'] = x.sort( (a,b) => b['similarity'] - a['similarity'] )
    }
    metrics['overall'] = {}
    
    if( all.length > 0 ){
        var scores = all.map(e => e['similarity'])
        for (f of ['max','min','mean']){
            metrics['overall'][f] = eval(`${f}(scores)`)
        }
    }
    else{
        for (f of ['max','min','mean']){
            metrics['overall'][k][f] = -1
        }
    }
    
    metrics['overall']['bySentence'] = all.sort( (a,b) => b['similarity'] - a['similarity'] )
    
    return metrics
}

/** 
* Given a question, it ranks the sentences found in the input list
* 
*
* @param {string} q Question
* @param {array} sentences List of sentences
* @param {string} st Similarity metric (options: cosne, tversky and oo)
*
* @returns {Object} Object containing the ranked sentences (bySentence property) with their similarity scores according to the questionand the summary statistics of scores (max, min and mean) in the overall mode
* 
* @example
* let v = await survc2.filter_context_sentences('Is there evidence for the carcinogenicity of opium consumption?', ['1 Cancer in humans\n There is sufficient evidence in humans for the carcinogenicity of opium consumption', '2 Cancer in experimental animals\n There is inadequate evidence in experimental animals regarding the carcinogenicity of opium'], 'tversky')
*/
survc2.filter_context_sentences = (q, sentences, st) => {
    var sim_types = ['cosine', 'tversky', 'oo']
    st = ( sim_types.includes(st) ) ? st : 'cosine'
     
    // Measure similarity by section
    // Choose the section containing the highest scores
    var all=[]
    var metrics = {'overall': [] }
    q = q.toLowerCase()
    var x = sentences.map( s => { return { 'sentence': s, 'similarity': survc2.calculate_sim(st, q, s) } } )
    all = all.concat(x)
    metrics['overall'] = {}
    var scores = all.map(e => e['similarity'])
    for (f of ['max','min','mean']){
        metrics['overall'][f] = eval(`${f}(scores)`)
    }
    metrics['overall']['bySentence'] = all.sort( (a,b) => b['similarity'] - a['similarity'] )
    
    return metrics
}

/** 
* Send a sentence to be grammatically corrected using open ai chat gpt
* 
*
* @param {string} sentence Sentence (maximum of 2000 words)
* @param {string} [model=gpt-3.5-turbo] GPT model to use
* @param {number} [temperature=0.7] Temperature (as you increase this number more random is the answer returned to you)
*
* @returns {array} List of answers with correction options 
* 
* @example
* let v = await survc2.correct_sentence_grammar(" In reaching this determina tion, the Wking Grup noted that in a cohort study of 50 045 adults in Golestan Province, a north-eatern province of the Islamic Republic of Iran, self-reported opium consumption was assessed at baseline, validated with urinary levels of opium metabolites, and the cohort was followed for more than a decade to ascertain inci dent cancers", 'gpt-3.5-turbo', 0.7)
*/
survc2.correct_sentence_grammar = async function (sentence, model='gpt-3.5-turbo', temperature=0.7){
    sentence = "Correct the grammar of the following sentence: "+sentence
    
    if(sentence.split(" ").length <= 2000){
        key = localStorage.GPT_API_key
        if(key!='' && key!=null && key!="none"){
            var obj = await 
                (await fetch(`https://api.openai.com/v1/chat/completions`,
                     {
                         method:'POST',
                         headers:{
                             'Authorization':`Bearer ${key}`,
                             'Content-Type': 'application/json',
                         },
                         body:JSON.stringify({
                             model: model,
                             messages: [ { role: "user", content: sentence } ]
                         })
                     })
                 ).json()
              
             var ans=[]   
             if( obj.choices != null ){
                if(obj.choices.length > 0 ){
                    for (var r of obj.choices){
                        ans.push(r.message.content)
                    }
                }
            }
            return ans
        }
        else{
            console.log('Error: Openai key was not found.')
        }
    }
    else{
        console.log('Error: The maximum input size is 2000 words.')
        alert('Error: The maximum input size is 2000 words.')
    }
}

/** 
* Retrieves mentions of agents in sentences
* 
*
* @param {array} sections Array of section objects containing the the properties: name - section name; page_start: initial page; page_end: final page and content: list of treated sentences
*
* @returns {array} List of agents
* 
* @example
* let content = await survc2.loadMonograph('https://publications.survc2.fr/_publications/media/download/5409/5f12a3cfc6a2291b8dca418b2d322642ccb8f0fc.pdf')
* var sections = await survc2.get_header_sections(content)
* sections = sectins.filter(e => e.name.includes('evaluation'))
* let v = await survc2.get_agents_from_nlp(sections)
*/
survc2.get_agents_from_nlp = (sections) => {
    var secnames = sections.map(e => e.name.toLowerCase())
    
    var agents = []
    for(var sc of sections){
        var sentences = sc.content.map(e => e.toLowerCase() ).filter(e => (e.includes('there is') && e.includes('evidence') && e.includes('carcinogenicity of') ) || ( e.includes('carcinogenic')  ) )
        sentences = survc2.remove_number_short_sentences(sentences)
        transformed = []
        sentences.forEach(e => { 
            secnames.forEach(s => { e = e.replaceAll(s, '') } )
            transformed.push( e ) 
        })
        for (var s of transformed){
            var piece = null
            if( s.includes('there is') && s.includes('evidence') && s.includes('carcinogenicity of') ){
                piece=s.split('carcinogenicity of ')[1]
                
            }
            else {
                if ( s.includes('carcinogenic') && !s.includes('carcinogenicity') ){
                    var temp = s.split("carcinogenic")[0]
                    var news=[]
                    for( var k of temp.split(' ') ){
                        if(k!="are" && k!="is"){
                            news.push(k)
                        }
                    }
                    piece=news.join(' ')
                }
            }
            
            piece = (piece!=null) ? piece.split(' ').filter(e => e!="").join(' ') : null
            if(piece!=null && !agents.includes(piece) ){
                agents.push( piece )
            }
        }
    }
    
    return agents
}

// In test, experimental
survc2.process_agent_sentence = (s) => {
    s = s.toLowerCase() 
    let doc = survc2.mod_nlp.nlp.readDoc(s);
    let keywords = doc.tokens().out();
    var transformed = []
    for (var k in keywords){
        transformed.push( { 'word': doc.tokens().out( survc2.mod_nlp.its.value )[k], 'pos': [ doc.tokens().out( survc2.mod_nlp.its.pos)[k].toLowerCase() ] } )
    }
    parseGenerator = survc2.mod_nlp.DependencyParser();
    parseIterator = parseGenerator(transformed);
    parsed = runIteratorUntilDone(parseIterator)
    
    return parsed
}

/** 
* Send a text with overall evaluation from monograph containing statements about the agents to extract the entities or names of these agents by open ai chat gpt
* 
*
* @param {string} text Evaluation section text (maximum of 2000 words)
*
* @returns {array} List of agent names
* 
* @example
* let v = await survc2.get_agents_from_gpt("There is sufficient evidence in humans for the carcinogenicity of opium consumption. Opium consumption causes cancers of the urinary bladder, larynx, and lung. Positive associations have been observed between opium consumption and cancers of the oesophagus, stomach, pancreas, and pharynx.2 Cancer in experimental animals There is inadequate evidence in experimental animals regarding the carcinogenicity of opium.3 Mechanistic evidence There is strong evidence in experimental systems that opium, specifically sukhteh and opium pyrolysates, exhibits key characteristics of carcinogens (it is genotoxic).4 Overall evaluation Opium consumption is carcinogenic to humans (Group 1) ")
*/
survc2.get_agents_from_gpt = async (text) =>{
    var agents = []
    if(text.split(" ").length <= 2000){
        agents = await survc2.correct_agents_from_gpt(text)
    }
    else{
        console.log('Error: The maximum input size is 2000 words.')
        alert('Error: The maximum input size is 2000 words.')
    }
    
    return agents
}

/** 
* Send a text with overall evaluation from monograph containing statements about the agents to extract the entities or names of these agents by open ai chat gpt
* 
*
* @param {string} eval_paragraph Evaluation section text
* @param {string} [model=gpt-3.5-turbo] GPT model to use
* @param {number} [temperature=0.7] Temperature (as you increase this number more random is the answer returned to you)
*
* @returns {array} List of agent names
* 
* @example
* let v = await survc2.correct_agents_from_gpt("There is sufficient evidence in humans for the carcinogenicity of opium consumption. Opium consumption causes cancers of the urinary bladder, larynx, and lung. Positive associations have been observed between opium consumption and cancers of the oesophagus, stomach, pancreas, and pharynx.2 Cancer in experimental animals There is inadequate evidence in experimental animals regarding the carcinogenicity of opium.3 Mechanistic evidence There is strong evidence in experimental systems that opium, specifically sukhteh and opium pyrolysates, exhibits key characteristics of carcinogens (it is genotoxic).4 Overall evaluation Opium consumption is carcinogenic to humans (Group 1) ", 'gpt-3.5-turbo', 0.7)
*/
survc2.correct_agents_from_gpt = async function ( eval_paragraph, model='gpt-3.5-turbo', temperature=0.7){
    sentence = "Extract the agents and the evaluation as a table in the following text: "+eval_paragraph

    key = localStorage.GPT_API_key
    if(key!='' && key!=null && key!="none"){
        var res = await 
            (await fetch(`https://api.openai.com/v1/chat/completions`,
                 {
                     method:'POST',
                     headers:{
                         'Authorization':`Bearer ${key}`,
                         'Content-Type': 'application/json',
                     },
                     body:JSON.stringify({
                         model: model,
                         messages: [ { role: "user", content: sentence } ]
                     })
                 })
             ).json()
             
         var ans = survc2.process_agent_gpt_result(res)
         return ans
    }
    else{
        console.log('Error: Openai key was not found.')
    }
}

/** 
* Treate and parse table of agents drawn by open ai chat gpt
* 
*
* @param {Object} obj Openai answer object
*
* @returns {array} List of agent names
* 
*/
survc2.process_agent_gpt_result = (obj) => {
    var agents=[]
    if( obj.choices != null ){
        if(obj.choices.length > 0 ){
            var t = obj.choices[0].message.content.split('\n')
            var head = t[0].split('|').slice(1, -1)
            var ind_ag = 0
            var i = 0
            for(var h of head){
                if( h.toLowerCase().indexOf('agent') != -1){
                    ind_ag=i
                    break
                }
                i+=1
            }
            
            for ( var l of t.slice(1) ){
                if(l.indexOf('---')==-1){
                    l = l.split('|').slice(1, -1)
                    //l = l.split('|')
                    if( ! agents.includes( l[ind_ag] ) && l[ind_ag] != '' && l[ind_ag] != ' ' && l[ind_ag]!=undefined ){
                        agents.push( l[ind_ag] )
                    }
                    
                }
            }
            
        }
    }
    
    return agents
}

/* ------------- Question answering functions ------------- */

/** 
* Send question to bert model by tensorflow js
* 
*
* @param {string} q Question
* @param {array} context List of sentences
*
* @returns {array} List of answers from bert
* 
* @example
* let v = await survc2.get_bert_answers( "Is there evidence for the carcinogenicity of opium consumption?", ["There is sufficient evidence in humans for the carcinogenicity of opium consumption.", "Opium consumption causes cancers of the urinary bladder, larynx, and lung.", "Positive associations have been observed between opium consumption and cancers of the oesophagus, stomach, pancreas, and pharynx.", "2 Cancer in experimental animals There is inadequate evidence in experimental animals regarding the carcinogenicity of opium.", "3 Mechanistic evidence There is strong evidence in experimental systems that opium, specifically sukhteh and opium pyrolysates, exhibits key characteristics of carcinogens (it is genotoxic).", "4 Overall evaluation Opium consumption is carcinogenic to humans (Group 1)"] )
*/
survc2.get_bert_answers = async (q, context) => {
    var corpus = context.join('. ')
    var answers = await survc2.mod_nlp.bertModel.findAnswers(q, corpus)
    return answers
}

/** 
* Send question, context paragrpahs from monographs and the instruction to open ai chat gpt
* 
*
* @param {array} messages Array of objects required for the competion in the question answering system of openai chat gpt (role: assistant, user or system; content: personalized text according to the role)
* @param {string} [model=gpt-3.5-turbo] GPT model to use
* @param {number} [temperature=0.7] Temperature (as you increase this number more random is the answer returned to you)
*
* @returns {Object} Openai answer object
* 
* @example
* let msgs = [ { role: 'system', content: "You are a helpful assistant that answer the question as truthfully as possible, in case you do not find the answer say 'I don't know' " }, { role: 'assistant', content: "There is sufficient evidence in humans for the carcinogenicity of opium consumption.  Opium consumption causes cancers of the urinary bladder, larynx, and lung. Positive associations have been observed between opium consumption and cancers of the oesophagus, stomach, pancreas, and pharynx." }, { role: 'user', content: "Is there evidence for the carcinogenicity of opium consumption?" } ]
* let v = await survc2.completions(msgs, 'gpt-3.5-turbo', 0.7)
*/
survc2.completions = async function (messages, model='gpt-3.5-turbo', temperature=0.7){
    key = localStorage.GPT_API_key
    if(key!='' && key!=null && key!="none"){
        return await 
            (await fetch(`https://api.openai.com/v1/chat/completions`,
                 {
                     method:'POST',
                     headers:{
                         'Authorization':`Bearer ${key}`,
                         'Content-Type': 'application/json',
                     },
                     body:JSON.stringify({
                         model:model,
                         messages: messages
                     })
                 })
             ).json()
    }
    else{
        console.log('Error: Openai key was not found.')
    }
}

/** 
* Send question to chat gpt
* 
*
* @param {string} q Question
* @param {array} context List of sentences
*
* @returns {array} List of answers from chat gpt
* 
* @example
* let v = await survc2.get_gpt_answers( "Is there evidence for the carcinogenicity of opium consumption?", ["There is sufficient evidence in humans for the carcinogenicity of opium consumption.", "Opium consumption causes cancers of the urinary bladder, larynx, and lung.", "Positive associations have been observed between opium consumption and cancers of the oesophagus, stomach, pancreas, and pharynx.", "2 Cancer in experimental animals There is inadequate evidence in experimental animals regarding the carcinogenicity of opium.", "3 Mechanistic evidence There is strong evidence in experimental systems that opium, specifically sukhteh and opium pyrolysates, exhibits key characteristics of carcinogens (it is genotoxic).", "4 Overall evaluation Opium consumption is carcinogenic to humans (Group 1)"] )
*/
survc2.get_gpt_answers = async (q, context) => {
    var corpus = context.join('. ')
    var instruction = "You are a helpful assistant that answer the question as truthfully as possible, in case you do not find the answer say 'I don't know' "
    var messages = []
    messages.push( { role: 'system', content: instruction } )
    messages.push( { role: 'assistant', content: corpus } )
    messages.push( { role: 'user', content: q } )
    
    var obj={ 'messages': messages, 'question': q }
    var answer = await survc2.completions( obj['messages'], 'gpt-3.5-turbo', 0.7)
    obj['answer'] = answer
    
    return obj
}

/** 
* Preparation function to treat the sentences prior to apllying the nlp search engine
* 
*
* @param {array} text Paragraph of concatenated sentences
*
* @returns {array} List of filtered tokens
* 
* @example
* let v = await survc2._prepTask( "There is sufficient evidence in humans for the carcinogenicity of opium consumption. Opium consumption causes cancers of the urinary bladder, larynx, and lung. Positive associations have been observed between opium consumption and cancers of the oesophagus, stomach, pancreas, and pharynx. 2 Cancer in experimental animals There is inadequate evidence in experimental animals regarding the carcinogenicity of opium. 3 Mechanistic evidence There is strong evidence in experimental systems that opium, specifically sukhteh and opium pyrolysates, exhibits key characteristics of carcinogens (it is genotoxic).4 Overall evaluation Opium consumption is carcinogenic to humans (Group 1)" )
*/
survc2._prepTask = function ( text ) {
  const tokens = [];
  survc2.mod_nlp.nlp.readDoc(text)
      .tokens()
      // Use only words ignoring punctuations etc and from them remove stop words
      .filter( (t) => ( t.out( survc2.mod_nlp.its.type) === 'word' && !t.out( survc2.mod_nlp.its.stopWordFlag) ) )
      // Handle negation and extract stem of the word
      .each( (t) => tokens.push( (t.out( survc2.mod_nlp.its.negationFlag)) ? '!' + t.out( survc2.mod_nlp.its.stem) : t.out( survc2.mod_nlp.its.stem) ) );

  return tokens;
}

/** 
* Send question to wink nlp
* 
*
* @param {string} q Question
* @param {array} context List of sentences
*
* @returns {array} List of answers from wink nlp
* 
* @example
* let v = await survc2.get_wink_answers( "Is there evidence for the carcinogenicity of opium consumption?", ["There is sufficient evidence in humans for the carcinogenicity of opium consumption.", "Opium consumption causes cancers of the urinary bladder, larynx, and lung.", "Positive associations have been observed between opium consumption and cancers of the oesophagus, stomach, pancreas, and pharynx.", "2 Cancer in experimental animals There is inadequate evidence in experimental animals regarding the carcinogenicity of opium.", "3 Mechanistic evidence There is strong evidence in experimental systems that opium, specifically sukhteh and opium pyrolysates, exhibits key characteristics of carcinogens (it is genotoxic).", "4 Overall evaluation Opium consumption is carcinogenic to humans (Group 1)"] )
*/
survc2.get_wink_answers = async (q, context) => {
    var corpus = survc2.remove_number_short_sentences(context, 3)
    corpus = corpus.map( s => { return { 'body': s} } )
    
    var query = q;

    var engine = survc2.mod_nlp.bm25();
    // Step I: Define config
    // Only field weights are required in this example.
    engine.defineConfig( { fldWeights: { body: 2 } } );
    // Step II: Define PrepTasks pipe.
    // Set up 'default' preparatory tasks i.e. for everything else
    engine.definePrepTasks( [ survc2._prepTask ] );

    // Step III: Add Docs
    // Add documents now...
    corpus.forEach( function ( doc, i ) {
      // Note, 'i' becomes the unique id for 'doc'
      engine.addDoc( doc, i );
    } );

    // Step IV: Consolidate
    // Consolidate before searching
    engine.consolidate();

    // `results` is an array of [ doc-id, score ], sorted by score
    var results = engine.search( query );
    // Print number of results.
    console.log( '%d entries found.', results.length );
    
    var i = 0
    for (var r of results){
        results[i][2] = corpus[ r[ 0 ] ].body 
        i+=1
    }
    
    return results
}

/* ------------- Scraping functions ------------- */

/** 
* Load table of scraped information containing the following order of information columns: link of the monogrpah page, volume, year and link of the monograph pdf
* 
*
*
* @returns {array} List of monograph volume objects, with the following properties: link, link_pdf, volume, year and name_agent
* 
* @example
* let v = await survc2.loadScrapedMonographs()
*/
survc2.loadScrapedMonographs = async function(){
    var lbs=[]
    var dat = await( await fetch(location.href.split('#')[0]+'links_scraped_complete.tsv') ).text()
    dat = dat.split('\n').slice(1).map(e => e.split('\t') )
    for (var d of dat){
        var name = d[0].split('/')
        name=name[name.length-1].split('-').slice(0,-1).join(' ')
        var obj = { 'link': d[0], 'link_pdf': d[3], 'volume': d[1], 'year': d[2], 'name_agent': name }
        lbs.push(obj)
    }
    return lbs
}

/** 
* Retrieve monograph web page contents and split into lines
* 
*
* @param {string} url Monograph web page link
*
* @returns {array} List of lines containing html content of the web page
* 
* @example
* let v = await survc2.getExtractLines('https://publications.survc2.fr/Book-And-Report-Series/Iarc-Monographs-On-The-Identification-Of-Carcinogenic-Hazards-To-Humans/1-1-1-Trichloroethane-And-Four-Other-Industrial-Chemicals-2022')
*/
survc2.getExtractLines = async function(url){
    url = 'https://corsproxy.io/?' + encodeURIComponent(url)
    var data = await (await fetch(url) ).text()
    data = data.split('\n')
    return data
}

/** 
* Retrieve monograph volume information from the web page
* 
*
* @param {Object} links Object whose key is the link to the individual monograph and the value is th volume and year (volume_year)
* @param {array} lines Lines of the web page
*
* @returns {Object} Incremented object whose key is the link to the individual monograph and the value is th volume and year (volume_year)
* 
* @example
* let lines = await survc2.processMonographLinkHtml('https://publications.survc2.fr/Book-And-Report-Series/Iarc-Monographs-On-The-Identification-Of-Carcinogenic-Hazards-To-Humans/1-1-1-Trichloroethane-And-Four-Other-Industrial-Chemicals-2022')
* var links = {}
* links = await survc2.processMonographLinkHtml(links, lines)
*/
survc2.processMonographLinkHtml = function(links, lines){
    flag=false
    for ( var l of lines){
        if(l.indexOf('<button class="page" type="submit" name="page"') !=-1 && l.toLowerCase().indexOf('next')==-1 ){
            n = parseInt(l.split('>')[1].split('<')[0])
        }
          
        if( l.indexOf('/Book-And-Report-Series/')!=-1 && l.indexOf('Details')==-1 && l.split('>').length > 2 ){
            key='https://publications.iarc.fr'+l.split('"')[1]
            flag=true
        }
        
        if(flag && l.indexOf('<h3')!=-1 ){
            volume=l.split('Volume ')[1].split('<')[0]
        }
            
        if(flag && l.indexOf('<p')!=-1 && l.indexOf('IARC')==-1 ){
            year=l.split('<p>')[1].split('<')[0]
            links[key] = volume+'_'+year
            flag=false
        }
    }
    
    return links
}

/** 
* Scrap the individual monograph page and extract the link to the pdf file 
* 
*
* @param {Object} links Object whose key is the link to the individual monograph and the value is th volume and year (volume_year)
*
* @returns {array} List of monograph volume objects, with the following properties: link, link_pdf, volume, year and name_agent
* 
* @example
* let lines = await survc2.processMonographLinkHtml('https://publications.survc2.fr/Book-And-Report-Series/Iarc-Monographs-On-The-Identification-Of-Carcinogenic-Hazards-To-Humans/1-1-1-Trichloroethane-And-Four-Other-Industrial-Chemicals-2022')
* var links = {}
* links = await survc2.processMonographLinkHtml(links, lines)
* var dat = await survc2.getBookLinks(links)
*/
survc2.getBookLinks = async function(links){
    var lbs=[]
    
    var cnt=0
    var i = 0
    var ide = Object.keys(links) 
    var info = []
    while (i < ide.length) {
        var end = ((i + 15) <= ide.length) ? i + 15 : ide.length
        var temp = ide.slice(i, end)
        info = info.concat(await Promise.all( temp.map( async l => {
            var lines = await survc2.getExtractLines(l)
            
            for (var li of lines){
                if( li.indexOf('/media/download/')!=-1 && li.indexOf('Download Free PDF')!=-1 ){
                    ld='https://publications.iarc.fr'+li.split('"')[1]
                    var name = l.split('/')
                    name=name[name.length-1].split('-').slice(0,-1).join(' ')
                    var obj = { 'link': l, 'link_pdf': ld, 'volume': links[l].split('_')[0], 'year': links[l].split('_')[1], 'name_agent': name }
                    lbs.push(obj)
                }
            }
            cnt+=1
            
            await sleep(300)
            
            return cnt
        })))
        
        i += 15
        if (i >= ide.length) {
            break
        }
    }
   
   return lbs
}

/** 
* Scraps automatically the iarc web page containing the list of monographs and crawl in each monograph page to get their information and pdf link 
* 
*
*
* @returns {array} List of monograph volume objects, with the following properties: link, link_pdf, volume, year and name_agent
* 
* @example
* var dat = await survc2.scrapSourceMonoGraphLinks()
*/
survc2.scrapSourceMonoGraphLinks = async function(){
    var result = {}
    
    var url= "https://publications.iarc.fr/Book-And-Report-Series/Iarc-Monographs-On-The-Identification-Of-Carcinogenic-Hazards-To-Humans?sort_by=year_desc&limit=50&page=1"
    survc2.getExtractLines(url).then( async lines => {
        var lines  = lines
        var links={}
        var n=0
        for (var l of lines){
            if(l.indexOf('<button class="page" type="submit" name="page"') !=-1 && l.toLowerCase().indexOf('next')==-1 ){
                n = parseInt(l.split('>')[1].split('<')[0])
            }
        }
        links = survc2.processMonographLinkHtml(links, lines)
            
        var urls=[]    
        for (var i=2; i<=n; i++){
            urls.push( "https://publications.iarc.fr/Book-And-Report-Series/Iarc-Monographs-On-The-Identification-Of-Carcinogenic-Hazards-To-Humans?sort_by=year_desc&limit=50&page="+i )
        }
        
        var cnt=0
        var i = 0
        var ide = urls
        var info = []
        while (i < ide.length) {
            var end = ((i + 15) <= ide.length) ? i + 15 : ide.length
            var temp = ide.slice(i, end)
            info = info.concat(await Promise.all( temp.map( async url => {
                lines = await survc2.getExtractLines(url)
                links = survc2.processMonographLinkHtml(links, lines)
                cnt+=1
                
                if(cnt==urls.length){
                    console.log('Books found:', Object.keys(links).length )
                    result = await survc2.getBookLinks(links)
                }
                
                await sleep(300)
                
                return cnt
            })))
            
            i += 15
            if (i >= ide.length) {
                break
            }
        } 
        
    } )
    
    return result
}


/** 
* Load a certain dependency library from link
* 
*
* @param {string} url Library URL.
* 
* @example
* loadScript('https://cdnjs.cloudflare.com/ajax/libs/pako/1.0.11/pako.min.js')
*
*/
async function loadScript (url){
	console.log(`${url} loaded`)
    async function asyncScript(url){
        let load = new Promise((resolve,regect)=>{
            let s = document.createElement('script')
            s.src=url
            s.onload=resolve
            document.head.appendChild(s)
        })
        await load
    }
    // satisfy dependencies
    await asyncScript(url)
}

if(typeof(pdfjsLib)=="undefined"){
	loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.5.141/pdf.min.js')
}

if(typeof(d3)=="undefined"){
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.4/d3.min.js')
}

if(typeof(tf)=="undefined"){
    loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs')
}

if(typeof(use)=="undefined"){
    loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/universal-sentence-encoder')
}
if(typeof(Plotly)=="undefined"){
	loadScript('https://cdn.plot.ly/plotly-2.16.1.min.js')
}
if(survc2.mod_nlp == null){
    //survc2.init_nlp().then( v => {} )
}
