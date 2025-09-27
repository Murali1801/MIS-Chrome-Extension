<!DOCTYPE html>
<html>
    <head>

        <link href="images/aldel.ico" rel="shortcut icon" type="image/x-icon" />  
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  
  <link href="../css_files/tablecloth/tablecloth.css" rel="stylesheet" type="text/css" media="screen" />
  <link rel="stylesheet" href="/css/bootstrap.min.css"> 
  <link rel="stylesheet" href="/css/font-awesome.min.css">
<link href="/dist/css/AdminLTE.min.css" rel="stylesheet" type="text/css" />
  <link rel='stylesheet' href='/css/alertify.core.css' />
 <link rel='stylesheet' href='/css/alertify.default.css' />
 <link href="../css_files/calendar/calendar.css" rel="stylesheet" type="text/css" />
<script language="JavaScript" src="../css_files/calendar/calendar.js" type="text/javascript" xml:space="preserve"></script>
  <script src="/js/jquery-1.11.1.min.js"></script>
  <script src="/js/bootstrap.min.js"></script>
  <script src='/js/alertify.min.js'></script>
  <script src='/js/validator.js'></script>
<script src="/dist/js/app.min.js" type="text/javascript"></script>    
     <!-- <link rel="stylesheet" href="../css_files/menu_style.css" type="text/css" />-->
        <link href="../css_files/notification.css" rel="stylesheet" type="text/css" />
        <script LANGUAGE="javascript" type="text/javascript">
            function confirmation() {
                alertify.confirm('Are you sure you want to Logout ?', function (e) {
               if (e) {
                  alertify.error("You've clicked Ok");
                  window.location = "../logout.php";
               } else {
                  alertify.error("You've clicked Cancel");
               }
            });
              /*var answer = confirm("Are you sure you want to Logout ?")
                if (answer){
                    window.location = "../logout.php";
                }*/
            }
        </script>
        <script TYPE="text/javascript">

            function popup(mylink, windowname) {
                if (! window.focus)return true;
                var href;
                if (typeof(mylink) == 'string')
                    href=mylink;
                else
                    href=mylink.href;
                window.open(href, windowname, 'width=1700,height=700,scrollbars=yes');
                return false;
            }

        </script>

        <script type="text/javascript">
            window.history.forward();
            function noBack() { window.history.forward(); }
        </script>
        
        
<link href="../images/aldel.ico" rel="shortcut icon" type="image/x-icon" />  
<title>Attendance & Unit Test Report</title>            
<link href="../css_files/tablecloth/tablecloth.css" rel="stylesheet" type="text/css" />
</head>

<link rel="stylesheet" href="/css/font-awesome.min.css">
<link rel="stylesheet" href="/css/menu_dashboard.css">

<body onload="noBack();myFunction_main();" onpageshow="if (event.persisted) noBack();" onunload="">
    
    
<!--<body onload="noBack();" onpageshow="if (event.persisted) noBack();" onunload="" 
      style="background-image: url('/images/logos/sjcet.jpg'); 
      background-position: center; background-repeat:no-repeat; background-attachment:fixed;background-color: #e6f0ff" >-->

      <nav class="navbar navbar-static-top">
    <div class="collapse navbar-collapse js-navbar-collapse">
    <ul class="nav navbar-nav navbar-right">
           <li>
            <div class="dropdown">
            <button class="dropbtn">V & M <br>Insti.</button>
            <div class="dropdown-content">
            <h4 class="text-center">Vision</h4>
                        <a href="#">1 . Excellence in Engineering Education & Creating Next-Gen Leaders / Managers in the Service of Society</a>
                    <h4 class="text-center">Mission</h4>
                    <a href="#">1 . To impart quality engineering education for holistic development</a>
                    <a href="#">2 . To provide conducive environment for joyful learning , innovation and research</a>
                    <a href="#">3 . To promote innovative technology enabled teaching & learning process</a>
                    <a href="#">4 . To nurture socially responsible engineers , entrepreneurs and leaders</a>
                    <a href="#">5 . To enhance employability skills to meet the changing industrial trends</a>
              
        </div>
        </div>
          </li>
        
               <li>
            <div class="dropdown">
  <button class="dropbtn">QP</button>
  <div class="dropdown-content">
    <h4 class="text-center">Quality Policy</h4>
     <a href="#"> To impart quality professional education with conducive environment for technology enabled teaching-learning 
     and to nurture socially responsible professionals with enhanced employability skills.</a>
       
  </div>
</div>
          </li>
                    <li>
            <div class="dropdown">
            <button class="dropbtn">V & M <br>Dept.</button>
            <div class="dropdown-content">
            <h4 class="text-center">Vision</h4>
                        <a href="#">1 . To be a department committed to develop capable and efficient Computer Engineering graduates with an aptitude for research and leadership qualities</a>
                    <h4 class="text-center">Mission</h4>
                    <a href="#">1 . To inculcate habit of life long leaning to become globally competent Computer Engineering
graduates.</a>
                    <a href="#">2 . To promote excellence by encouraging creativity, critical thinking and discipline.</a>
                    <a href="#">3 . To establish relationships with other institutes as well as industries to have collaborative
learning.</a>
              
        </div>
        </div>
          </li>
        
               <li>
            <div class="dropdown">
  <button class="dropbtn">P0</button>
  <div class="dropdown-content">
    <h4 class="text-center">Program OutCome</h4>
        <a href="#">1 . At the end of the programme the student will be able to  apply the basic knowledge in mathematics, science and engineering.</a>
        <a href="#">2 . At the end of the programme the student will be able to identify,   analyse,   and   formulate   complex   engineering   problems   in   the   domain   of computer engineering.</a>
        <a href="#">3 . At the end of the programme the student will be able to:Effectively use computing tools for analysis, design and implementation of computing systems which resolve real life problems</a>
        <a href="#">4 . At the end of the programme the student will be able to:Design and conduct experiments, as well as to organize, analyse, and interpret data</a>
        <a href="#">5 . At the end of the programme the student will be able to:Use modern tools for engineering practices</a>
        <a href="#">6 . At the end of the programme the student will be able to:Understand the impact of an engineer in general and Computer Engineer in particular on societal, safety, health, legal, and cultural issues.</a>
        <a href="#">7 . At the end of the programme the student will be able to:Understand the need and impact of computer engineering solutions on environment and its sustainability</a>
        <a href="#">8 . At the end of the programme the student will be able to:Understand   the   professional,   legal,   and   ethical   responsibilities   in   engineering practices</a>
        <a href="#">9 . At the end of the programme the student will be able to: Function effectively on multidisciplinary teams to accomplish a common goal</a>
        <a href="#">10 . At the end of the programme the student will be able to:Communicate effectively by oral, written, and graphical means</a>
        <a href="#">11 . At the end of the programme the student will be able to:Undertake research activity and demonstrate effective project management skills</a>
        <a href="#">12 . At the end of the programme the student will be able to:Recognise the need for, and an ability to engage in life­long learning</a>
        
  </div>
</div>
          </li>
                    <li>
            <div class="dropdown">
  <button class="dropbtn">PE0</button>
  <div class="dropdown-content">
    <h4 class="text-center">Program Education Objectives</h4>
        <a href="#">1 . The B.E.(Computer Engineering) graduates will be able to   attain   knowledge,   skills   and   competencies   for   futuristic   needs   required   at national and international level with ethical standards.</a>
        <a href="#">2 . The B.E.(Computer Engineering) graduates will be able o contribute to the development of computer engineering through research.</a>
        <a href="#">3 . The B.E.(Computer Engineering) graduates will be able to display personal growth by pursuing higher studies, professional development courses, and/or engineering certification</a>
        
  </div>
</div>
          </li>
                  <li>
        <div class="dropdown">
        <button class="dropbtn">PS0</button>
        <div class="dropdown-content">
          <h4 class="text-center">Program Specific Outcome</h4>
                    <a href="#">1 . An ability to apply concepts of engineering mathematics, discrete mathematics, data structures, algorithmic principles, object-oriented programming concepts, and theoretical computer science in the modelling and design of computer-based systems.</a>
                    <a href="#">2 . To apply a research-based approach using innovative tools and techniques in the field of networking, operating systems, artificial intelligence security techniques, and database management and mining techniques to deliver quality results and valid conclusions.</a>
                    <a href="#">3 . Ability to secure employment or be an entrepreneur and apply the knowledge and understanding of engineering principles while portraying competencies like teamwork, effective verbal and written communication skills, and a zeal for lifelong learning with an ethical responsibility.</a>
              
        </div>
        </div>
        </li>
                      <!-- <li><a href="../main.php"><i class="fa fa-home" style="font-size:20px;"></i></a></li>-->
                 <li>
                        <input type="text" onkeyup="showResult(this.value)" placeholder="Search Menu"/>
                    
        </li>
                     <li class="mis-list-link">   <a href="#" class="dropdown-toggle" data-toggle="dropdown"><i class="fa fa-user"></i> &nbsp; &nbsp;Acharya Muralidhar <b class="caret"></b></a>
            
            <ul class="dropdown-menu dropdown-mis-css">
                              <li><a href="/view_profile.php?id='T3RoZXJz'&sub='TWlzYw=='&name='VmlldyBQcm9maWxl'"><i class="fa fa-file-text-o">&nbsp;</i>  View Profile</a></li>                
                <li><a href="../about.php?id='T3RoZXJz'&sub='TWlzYw=='&name='VmlldyBQcm9maWxl'"><i class="fa fa-font">&nbsp;</i> About MIS</a></li>
                <li class="divider"></li>
                <li><a href="javascript:void(0)" onclick="confirmation()"><i class="fa fa-sign-out"></i>&nbsp; Sign Out</a></li> 
                     </ul>
    </li>
   </ul>
  
    <ul class="nav navbar-nav">
         <li><a href="../main.php"><i class="fa fa-home" style="font-size:14px;"></i></a></li>
	<li class="dropdown dropdown-large">
            <a href="#" class="dropdown-toggle" data-toggle="dropdown"> <img src="/images/logos/sjcet.jpg" alt="sjcet" height="20" width="42">&nbsp;&nbsp;St. John College of Engineering and Management </a> 
         <ul class="dropdown-menu dropdown-menu-large row menu-color">             
                             <li class="col-sm-menu">
		<ul>
                     <li class="dropdown-submenu">  <a  style='color:#fff' href="#" class="dropdown-toggle" data-toggle="dropdown"> Academics</a>               
                     <ul class="dropdown-menu menu-color14"><li>
                             <a href="/alumni/alumni_registration.php?id='QWx1bW5p'&sub='QWNhZGVtaWNz'&name='QWx1bW5pIFJlZ2lzdHJhdGlvbiBGb3Jt' " class="onclick_menu" data-id="Alumni" data-sub="Academics"> Alumni </a></li> 
                                                 <li><a href="/online_exam/index.php?id='QXBwbHkgT25saW5l'&sub='QWNhZGVtaWNz'&name='RW5kIFNlbWVzdGVyIEV4YW1pbmF0aW9u' " class="onclick_menu" data-id="Apply Online" data-sub="Academics"> Apply Online </a></li> 
                                                 <li><a href="/feedback/stud_staff_qnty_feedback.php?id='RmVlZGJhY2s='&sub='QWNhZGVtaWNz'&name='U3R1ZGVudCBGZWVkYmFjaw==' " class="onclick_menu" data-id="Feedback" data-sub="Academics"> Feedback </a></li> 
                                                 <li><a href="/sjcet/view_stud_atb_marks_report.php?id='UmVwb3J0cw=='&sub='QWNhZGVtaWNz'&name='QVRCL1F1aXogVGVzdCBSZXBvcnQgKFN0dWRlbnQp' " class="onclick_menu" data-id="Reports" data-sub="Academics"> Reports </a></li> 
                                                 <li><a href="/sjcet/view_stud_end_result.php?id='UmVzdWx0'&sub='QWNhZGVtaWNz'&name='VmlldyBGaW5hbCBSZXN1bHQ=' " class="onclick_menu" data-id="Result" data-sub="Academics"> Result </a></li> 
                                     </ul></li> 
                        </ul>
                                        <li class="col-sm-menu">
		<ul>
                     <li class="dropdown-submenu">  <a  style='color:#fff' href="#" class="dropdown-toggle" data-toggle="dropdown"> Misc</a>               
                     <ul class="dropdown-menu menu-color14"><li>
                             <a href="/complaint/exam_data_correction.php?id='Q29tcGxhaW50'&sub='TWlzYw=='&name='RXhhbSBEYXRhIENvcnJlY3Rpb24=' " class="onclick_menu" data-id="Complaint" data-sub="Misc"> Complaint </a></li> 
                                                 <li><a href="/update_aadhar_no.php?id='T3RoZXJz'&sub='TWlzYw=='&name='VXBkYXRlIEFhZGhhciBDYXJkIE5vLg==' " class="onclick_menu" data-id="Others" data-sub="Misc"> Others </a></li> 
                                     </ul></li> 
                        </ul>
                                        <li class="col-sm-menu">
		<ul>
                     <li class="dropdown-submenu">  <a  style='color:#fff' href="#" class="dropdown-toggle" data-toggle="dropdown"> NAAC</a>               
                     <ul class="dropdown-menu menu-color14"><li>
                             <a href="/nba/student_infra_feedback.php?id='RmVlZGJhY2s='&sub='TkFBQw=='&name='SW5mcmFzdHJ1Y3R1cmUgRmVlZGJhY2s=' " class="onclick_menu" data-id="Feedback" data-sub="NAAC"> Feedback </a></li> 
                                     </ul></li> 
                        </ul>
                                        <li class="col-sm-menu">
		<ul>
                     <li class="dropdown-submenu">  <a  style='color:#fff' href="#" class="dropdown-toggle" data-toggle="dropdown"> OBA</a>               
                     <ul class="dropdown-menu menu-color14"><li>
                             <a href="/dynamic_feedback/student_feedback.php?id='RmVlZGJhY2s='&sub='T0JB'&name='TkJBIC0gRW5kIFNlbWVzdGVyIEZlZWRiYWNr' " class="onclick_menu" data-id="Feedback" data-sub="OBA"> Feedback </a></li> 
                                                 <li><a href="/nba/view_syllabus_student.php?id='UmVwb3J0cw=='&sub='T0JB'&name='VmlldyBTeWxsYWJ1cw==' " class="onclick_menu" data-id="Reports" data-sub="OBA"> Reports </a></li> 
                                     </ul></li> 
                        </ul>
                                        <li class="col-sm-menu">
		<ul>
                     <li class="dropdown-submenu">  <a  style='color:#fff' href="#" class="dropdown-toggle" data-toggle="dropdown"> Payment</a>               
                     <ul class="dropdown-menu menu-color14"><li>
                             <a href="/admission/view_payment_details_student.php?id='UGF5bWVudA=='&sub='UGF5bWVudA=='&name='RmVlIERldGFpbHM=' " class="onclick_menu" data-id="Payment" data-sub="Payment"> Payment </a></li> 
                         
         </ul>
        </li>
       
    </ul>
                
</div>
</nav>
 <div id="livesearch"></div>
<input id="sub_menu_text" type="hidden" value="a"/>
<div class="row row-modified">
    <div class="col-sm-3">
        <div class="padding-menu-icon">
        <a class="mini-submenu" id="show_hidden_icon">
        <i id="fa-icon-change" class="fa fa-angle-double-left"></i>       
        </a>
        </div>
    </div>
    <div class="col-sm-5 text-left">
        <span class="row-span-mis">  <i class="glyphicon glyphicon-home"></i>  / Academics / Reports / Attendance & Unit Test Report (Student)        </span>  <!-- <ul class="breadcrumb">
        <li class="">
           Academics        </li>
        <li>
           Reports        </li>
        <li >
            Attendance & Unit Test Report (Student)        </li>
    </ul>-->
       <!--<div class="btn-group btn-breadcrumb">
          <a href="#" class="btn btn-success a-hover-breadcrumb"><i class="glyphicon glyphicon-home"></i></a>
            <a href="#" class="btn btn-success a-hover-breadcrumb">Academics</a>
            <a href="#" class="btn btn-success a-hover-breadcrumb">Reports</a>
            <a href="#" class="btn btn-success a-hover-breadcrumb" id="sib_menu_name">Attendance & Unit Test Report (Student)</a>
      </div>-->
    </div>
     
</div>
<!--<aside class="main-sidebar">
        <!-- sidebar: style can be found in sidebar.less -->
        <section class="sidebar">
 <!--<div id="side_menu_user_defined"></div>
	</section>
</aside>-->
<div class="container-fluid">
  <div class="row">    
     <div class="col-sm-2 sidenav" id="fade_out_side_menu">         
        <div id="side_menu_user_defined"></div>
     </div>
   
<div class="col-sm-9 text-left">
  <br>
    <br><br><script type="text/javascript">
  // var path_gs; fade_out_side_menu
  $(document).on('click', '#show_hidden_icon', function () {
     $('#fade_out_side_menu').fadeToggle("fast",function(){
       var val=$('.padding-menu-icon').css('padding-left');  
      // alert(val);
       if(val != '5px'){         
       $(".padding-menu-icon").css({"padding-left":"5px"}); 
       $("#show_hidden_icon").html("<i class='fa fa-angle-double-right'></i>");
      }else{
        // $("#fa-icon-change").attr('fa fa-angle-double-left', 'fa fa-angle-double-right');
        $(".padding-menu-icon").css({
        "padding-left":"250px"
        });
        $("#show_hidden_icon").html("<i class='fa fa-angle-double-left'></i>");
    }
     });
   });
    
   $( document ).ready(function() { 
     // $("body").css("overflow", "hidden");
       var check = $("#sub_menu_text").val();      
      if(check == 'a'){
       var path_gs = 'UmVwb3J0cw=='; 
       var sub = 'QWNhZGVtaWNz'; 
       var sub_name = 'QXR0ZW5kYW5jZSAmIFVuaXQgVGVzdCBSZXBvcnQgKFN0dWRlbnQp';  
      $.get("../action.php",
        {           
            path_gs: path_gs,
            sub:sub,
            sib_menu_name: sub_name,
            action:1
        },
        function(data,status){
          //  alert(data);            
      $('#side_menu_user_defined').html(data);
        });
    }else{
        var check1 = $("#sub_menu_text").val(); 
      // alert(check1);
       var path_gs = 'UmVwb3J0cw=='; 
       //alert(path_gs);
       var sub = 'QWNhZGVtaWNz'; 
       //alert(sub);
       var sub_name = 'QXR0ZW5kYW5jZSAmIFVuaXQgVGVzdCBSZXBvcnQgKFN0dWRlbnQp';  
      // alert(sub_name);
      $.get("../action.php",
        {           
            path_gs: path_gs,
            sub:sub,
            sib_menu_name: sub_name,
            action:1
        },
        function(data,status){
          //  alert(data);            
      $('#side_menu_user_defined').html(data);
        });
    }
   
});
function showResult(str) {
//alert("dfgsdfgsdfg");
  if (str.length == 0) {
    document.getElementById("livesearch").innerHTML="";
    document.getElementById("livesearch").style.border="0px";
    return;   
  }
  
  if (window.XMLHttpRequest) {     
    // code for IE7+, Firefox, Chrome, Opera, Safari
    xmlhttp=new XMLHttpRequest();
  } else {  // code for IE6, IE5
    xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
  }
  xmlhttp.onreadystatechange=function() {      
    if (xmlhttp.readyState==4 && xmlhttp.status==200) {
        //alert(xmlhttp.responseText);
      document.getElementById("livesearch").innerHTML=xmlhttp.responseText;
      document.getElementById("livesearch").style.border="1px solid #A5ACB2";
      document.getElementById("livesearch").style.backgroundColor = 'white';
     document.getElementById("livesearch").style.position = "absolute";
      document.getElementById("livesearch").style.left = '76.9%';
      document.getElementById("livesearch").style.top = '5.9%';
      document.getElementById("livesearch").style.width = "13.4%";
      document.getElementById('livesearch').style.zIndex = "10";  
  }
  }
  xmlhttp.open("GET","../action.php?action_ajax=1&str="+str,true);
  xmlhttp.send();
}
function showResult_main(str) {
//alert("dfgsdfgsdfg");
  if (str.length == 0) {
    document.getElementById("livesearch").innerHTML="";
    document.getElementById("livesearch").style.border="0px";
    return;   
  }
  
  if (window.XMLHttpRequest) {     
    // code for IE7+, Firefox, Chrome, Opera, Safari
    xmlhttp=new XMLHttpRequest();
  } else {  // code for IE6, IE5
    xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
  }
  xmlhttp.onreadystatechange=function() {      
    if (xmlhttp.readyState==4 && xmlhttp.status==200) {
        //alert(xmlhttp.responseText);
      document.getElementById("livesearch").innerHTML=xmlhttp.responseText;
      document.getElementById("livesearch").style.border="1px solid #A5ACB2";
      document.getElementById("livesearch").style.background = 'none repeat scroll 0% 0% #FFF';
     document.getElementById("livesearch").style.position = "absolute";
      document.getElementById("livesearch").style.left = '76.9%';
      document.getElementById("livesearch").style.top = '5.9%';
      document.getElementById("livesearch").style.width = "13.4%";
      document.getElementById('livesearch').style.zIndex = "10";
    }
  }
  xmlhttp.open("GET","action.php?action_ajax=1&str="+str,true);
  xmlhttp.send();
}
function myFunction_main() {
   // alert("HIi");
    $.get("action.php",
             {
                action_dashlets:3
             },function(data,status){
                // alert(data);
                 $("#dashlet-workarea").html(data);
        });
}  

$(document).on('click', '.hoddashletclass', function () {

  var parVal = $(this).data('id');
  //alert(parVal);
  $("#hoddashletmodalajax").html(" ");
$.ajax({url:"main_action.php",
            type: "GET",
            scriptCharset: "UTF-8",
            data: {
              parVal: parVal,
              action_HOD_Modal:1
             },
            beforeSend : function() {
                  $("#hoddashletmodalajax").show().html("<center><img src='images/ajax-loader.gif'/></center>");
             },
            success:function(data){ 
               $("#hoddashletmodalajax").html(data);
             }, 
             error: function (request, error) {
                        console.log(request);
                      //  alert(" Can't do because: " + error);
             }
 });


});


$(document).on('click', '.actionTakenClass', function () {

var actionParameter = $(this).data('id');
var emp_id =$(this).data('emp');
var subject =$(this).data('subject');
var slot =$(this).data('slot');
//alert(actionParameter);
$.ajax({url:"main_action.php",
            type: "GET",
            scriptCharset: "UTF-8",
            data: {
              actionParameter: actionParameter,
              emp_id: emp_id,
              subject: subject,
              slot: slot,
              actionTaken:1
             },
            beforeSend : function() {
                  $("#hoddashletactionmodalajax").show().html("<center><img src='images/ajax-loader.gif'/></center>");
             },
            success:function(data){ 
               $("#hoddashletactionmodalajax").html(data);
             }, 
             error: function (request, error) {
                        console.log(request);
                       // alert(" Can't do because: " + error);
             }
 });
});


$(document).on('click', '#submitLeaveModalID', function () {
var actionParameter = $("#parameterLeaveModalID").val();
var emp_id =$("#emp_idLeaveModalID").val();
var subject =$("#subjectLeaveModalID").val();
var slot =$("#slotLeaveModalID").val();
var description=$("#actionDescriptionLeaveModalID").val();
//alert(actionParameter);
$.ajax({url:"main_action.php",
        type:"GET",
        scriptCharset: "UTF-8",
        data: {
              actionParameter: actionParameter,
              emp_id: emp_id,
              subject: subject,
              slot: slot,
              description: description, 
              actionLeave: 1
        },
        success:function(data,status){
          alert(data);
        }

});
});

</script>
    

    
        <!--        added by sharvari on may 30 2014 -->
        <table style="margin: auto;">
            <tr>
                <th>Roll No. : 2</th>
                <th>Status : Regular</th>
            </tr>
            <tr>
                <th>
                    Sem : 5                </th>
                <th>Div : A</th>
            </tr>
        </table>
        <table style="margin: auto;">
            <tr>
                <th>Subject</th>
                <th>Total Lectures Conducted</th>
                <th>Lectures Attended</th>
                <th>(%)</th>
            </tr>
                        <tr>
                    <td> Theoretical Computer Science </td>
                    <td style="text-align: center;"> 36 </td>
                    <td style="text-align: center;"> 35 </td>
                    <td style="text-align: center;">
                        97.22                    </td>
                </tr>
                            <tr>
                    <td> Soft Computing </td>
                    <td style="text-align: center;"> 39 </td>
                    <td style="text-align: center;"> 36 </td>
                    <td style="text-align: center;">
                        92.31                    </td>
                </tr>
                            <tr>
                    <td> AI and Machine  Learning </td>
                    <td style="text-align: center;"> 43 </td>
                    <td style="text-align: center;"> 42 </td>
                    <td style="text-align: center;">
                        97.67                    </td>
                </tr>
                            <tr>
                    <td> Cryptography and System Security </td>
                    <td style="text-align: center;"> 36 </td>
                    <td style="text-align: center;"> 34 </td>
                    <td style="text-align: center;">
                        94.44                    </td>
                </tr>
                            <tr>
                    <td> Basics of Marketing Management </td>
                    <td style="text-align: center;"> 36 </td>
                    <td style="text-align: center;"> 31 </td>
                    <td style="text-align: center;">
                        86.11                    </td>
                </tr>
                        <tr>
                <td style="text-align: right;"><b>Total</b></td>
                <td style="text-align: center;"><b>190</b></td>
                <td style="text-align: center;"><b>178</b></td>
            </tr>
        </table>
        <label style='text-align: center;'>Overall Theory Attendance: 93.68%</label>            <br>    
            <table style="margin: auto;">                
                <tr>
                    <th>Subject</th>
                    <th>Total Practical's Conducted</th>
                    <th>Practical's Attended</th>
                    <th>(%)</th>

                </tr>
                                <tr>
                        <td> AI and Machine  Learning </td>
                        <td style="text-align: center;"> 20 </td>
                        <td style="text-align: center;"> 18 </td>
                        <td style="text-align: center;">
                90                        </td>
                <!--                        <td>
                                        </td>-->
                    </tr>
                                <tr>
                        <td> Cryptography and System Security </td>
                        <td style="text-align: center;"> 10 </td>
                        <td style="text-align: center;"> 10 </td>
                        <td style="text-align: center;">
                100                        </td>
                <!--                        <td>
                                        </td>-->
                    </tr>
                                <tr>
                        <td> Soft Computing </td>
                        <td style="text-align: center;"> 20 </td>
                        <td style="text-align: center;"> 16 </td>
                        <td style="text-align: center;">
                80                        </td>
                <!--                        <td>
                                        </td>-->
                    </tr>
                                <tr>
                        <td> Theoretical Computer Science </td>
                        <td style="text-align: center;"> 9 </td>
                        <td style="text-align: center;"> 9 </td>
                        <td style="text-align: center;">
                100                        </td>
                <!--                        <td>
                                        </td>-->
                    </tr>
                        </table>
                <label style='text-align: center;'>Overall Practical Attendance: 89.83%</label><br><label style="text-align: center;">Unit Test Marks Not Available.</label></body>
</html>
